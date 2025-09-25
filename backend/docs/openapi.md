# API docs (OpenAPI/Swagger)

This project uses L5-Swagger to generate OpenAPI docs from annotations.

After the Pet migration, ensure docs reflect `/api/pets` endpoints:

1. Confirm `config/l5-swagger.php` excludes legacy Cat controllers under `scanOptions.exclude`.
2. Regenerate docs:

```
php artisan l5-swagger:generate
```

The output is written to `storage/api-docs/api-docs.json` (and YAML if enabled). Open the UI at `/api/documentation` when the dev server is running.
