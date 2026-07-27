# ─────────────────────────────────────────────────────────────────────────────
# Regera dados/se-municipios.geojson a partir da malha oficial do IBGE.
#
# Rodar só quando quiser trocar a procedência da geometria ou atualizar o ano
# da malha. O arquivo que acompanha o pacote veio de um espelho da malha do
# IBGE no GitHub (tbrugz/geodata-br), que já está em resolução reduzida e
# serve bem para coroplético, mas não tem cadeia de procedência citável.
# Este script produz o mesmo esquema a partir do geobr, que puxa do IBGE.
#
# O esquema de saída é o que o módulo JS espera:
#   FeatureCollection, cada feature com properties$id (código IBGE de 7
#   dígitos, como texto) e properties$name (nome do município).
# ─────────────────────────────────────────────────────────────────────────────

library(sf)
library(geobr)
library(dplyr)
library(jsonlite)

# ---- PARÂMETROS ----
ANO_MALHA  <- 2022
TOLERANCIA <- 200    # metros, para st_simplify. 0 desliga a simplificação.
DECIMAIS   <- 3      # 3 decimais equivalem a cerca de 110 m
SAIDA      <- "dados/se-municipios.geojson"

# ---- MALHA ----
malha <- geobr::read_municipality(code_muni = "SE", year = ANO_MALHA, simplified = TRUE)

if (TOLERANCIA > 0) {
  # Simplifica em metros (UTM 24S) e volta para coordenadas geográficas, que é
  # o que o módulo JS projeta. st_simplify age por polígono, então tolerância
  # alta abre frestas entre municípios vizinhos. Acima de 300 m isso começa a
  # aparecer na tela.
  malha <- malha %>%
    st_transform(31984) %>%
    st_simplify(dTolerance = TOLERANCIA, preserveTopology = TRUE) %>%
    st_transform(4674)
}

geo <- malha %>%
  transmute(
    id   = as.character(code_muni),
    name = name_muni
  )

# ---- CONFERÊNCIA ----
stopifnot(nrow(geo) == 75)
stopifnot(!any(is.na(geo$id)), !any(duplicated(geo$id)))
message("municípios: ", nrow(geo))
message("vértices: ", sum(sapply(st_geometry(geo), function(g) nrow(st_coordinates(g)))))

# ---- ESCRITA ----
# geojsonsf e st_write não expõem controle fino de arredondamento, então a
# escrita passa por jsonlite para manter o arquivo pequeno.
if (file.exists(SAIDA)) file.remove(SAIDA)
st_write(geo, SAIDA, driver = "GeoJSON", layer_options = c(
  paste0("COORDINATE_PRECISION=", DECIMAIS),
  "RFC7946=NO"
), quiet = TRUE)

# Acrescenta a nota de procedência como membro extra do FeatureCollection.
# GeoJSON permite membros adicionais e o módulo JS ignora o que não conhece.
doc <- jsonlite::fromJSON(SAIDA, simplifyVector = FALSE)
doc$fonte <- paste0(
  "Malha municipal digital do IBGE, ", ANO_MALHA,
  ", obtida via pacote geobr. Simplificada com tolerância de ",
  TOLERANCIA, " m e coordenadas com ", DECIMAIS, " decimais."
)
writeLines(jsonlite::toJSON(doc, auto_unbox = TRUE, digits = NA), SAIDA)

message("gravado: ", SAIDA, " (", round(file.size(SAIDA) / 1024), " KB)")
