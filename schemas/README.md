# Schemas

Put `pacs.008.001.08.xsd` here (the CBPR+ SR2025 usage-guideline schema from Swift MyStandards) to have the test suite validate every generated pacs.008 against it with `xmllint`.

The XSD is licensed by Swift, so `*.xsd` files in this folder are git-ignored and excluded from the Docker build. To keep the file somewhere else, set `PACS008_XSD` to its path instead.
