# pgvector Installation Guide for Windows

**PostgreSQL Version**: 16.10 (64-bit)
**pgvector Version**: Latest compatible with PostgreSQL 16
**Date**: October 2025

## Prerequisites

- PostgreSQL 16.x installed (✅ Confirmed: 16.10)
- Administrator access to Windows
- PostgreSQL bin directory in PATH (for psql command)

## Installation Methods

### Method 1: Pre-compiled Binaries (Recommended - Easiest)

#### Step 1: Download pgvector for Windows
```powershell
# Download latest pgvector release for PostgreSQL 16
# Visit: https://github.com/pgvector/pgvector/releases
# Look for: pgvector-X.X.X-windows-x64-pg16.zip
```

Or use PowerShell to download directly:
```powershell
# Navigate to downloads directory
cd $env:USERPROFILE\Downloads

# Download latest release (update version as needed)
Invoke-WebRequest -Uri "https://github.com/pgvector/pgvector/releases/download/v0.7.4/pgvector-0.7.4-windows-x64-pg16.zip" -OutFile "pgvector-pg16.zip"

# Extract the ZIP file
Expand-Archive -Path "pgvector-pg16.zip" -DestinationPath "pgvector-pg16"
```

#### Step 2: Install Extension Files
```powershell
# Find PostgreSQL installation directory
# Common locations:
# - C:\Program Files\PostgreSQL\16
# - C:\PostgreSQL\16

# Set PostgreSQL directory (adjust path if different)
$PGDIR = "C:\Program Files\PostgreSQL\16"

# Copy extension files (run as Administrator)
Copy-Item "pgvector-pg16\vector.dll" -Destination "$PGDIR\lib\"
Copy-Item "pgvector-pg16\vector.control" -Destination "$PGDIR\share\extension\"
Copy-Item "pgvector-pg16\vector--*.sql" -Destination "$PGDIR\share\extension\"
```

#### Step 3: Restart PostgreSQL Service
```powershell
# Restart PostgreSQL service (run as Administrator)
Restart-Service -Name "postgresql-x64-16"

# Or use Services GUI:
# 1. Press Win + R
# 2. Type: services.msc
# 3. Find "postgresql-x64-16"
# 4. Right-click → Restart
```

#### Step 4: Verify Installation
```powershell
# Connect to database
psql -h localhost -U postgres -d tpedb

# Check if extension is available
SELECT * FROM pg_available_extensions WHERE name = 'vector';
# Expected: 1 row with name='vector'

# Install extension
CREATE EXTENSION IF NOT EXISTS vector;

# Verify installation
SELECT * FROM pg_extension WHERE extname = 'vector';
# Expected: 1 row with extname='vector'

# Test vector operations
SELECT '[1,2,3]'::vector;
# Expected: [1,2,3]
```

---

### Method 2: Build from Source (Advanced - If binaries don't work)

**Requirements**:
- Visual Studio 2019 or later
- PostgreSQL development headers
- Git for Windows

#### Step 1: Clone Repository
```powershell
cd $env:USERPROFILE\Downloads
git clone --branch v0.7.4 https://github.com/pgvector/pgvector.git
cd pgvector
```

#### Step 2: Build with Visual Studio
```powershell
# Open Visual Studio Developer Command Prompt
# Navigate to pgvector directory
cd C:\Users\%USERNAME%\Downloads\pgvector

# Set PostgreSQL directory
set PGROOT=C:\Program Files\PostgreSQL\16

# Build extension
nmake /F Makefile.win

# Install extension
nmake /F Makefile.win install
```

#### Step 3: Restart PostgreSQL and Verify (same as Method 1, Step 3-4)

---

## Troubleshooting

### Issue 1: Extension Not Available After Installation
**Symptom**: `pg_available_extensions` shows 0 rows for 'vector'

**Solutions**:
1. Verify files were copied to correct PostgreSQL directory:
   ```powershell
   dir "C:\Program Files\PostgreSQL\16\lib\vector.dll"
   dir "C:\Program Files\PostgreSQL\16\share\extension\vector.control"
   ```

2. Check PostgreSQL service restarted successfully:
   ```powershell
   Get-Service -Name "postgresql-x64-16"
   ```

3. Check PostgreSQL logs for errors:
   ```powershell
   Get-Content "C:\Program Files\PostgreSQL\16\data\log\postgresql-*.log" -Tail 50
   ```

### Issue 2: Permission Denied During File Copy
**Symptom**: "Access denied" when copying files

**Solution**: Run PowerShell as Administrator:
1. Right-click PowerShell icon
2. Select "Run as Administrator"
3. Re-run copy commands

### Issue 3: Wrong PostgreSQL Version
**Symptom**: Extension fails to load or crashes

**Solution**: Ensure pgvector binary matches PostgreSQL version EXACTLY:
- PostgreSQL 16.x → Use pgvector for pg16
- Check version: `psql --version`

### Issue 4: DLL Not Found
**Symptom**: "could not load library vector.dll"

**Solution**:
1. Verify vector.dll is in PostgreSQL lib directory
2. Check for missing dependencies:
   ```powershell
   dumpbin /dependents "C:\Program Files\PostgreSQL\16\lib\vector.dll"
   ```
3. Install Visual C++ Redistributables if needed

---

## Verification Commands

After successful installation, run these commands to verify pgvector is working:

```sql
-- Check extension version
SELECT * FROM pg_extension WHERE extname = 'vector';

-- Test vector data type
SELECT '[1,2,3]'::vector AS test_vector;

-- Test vector operations
SELECT '[1,2,3]'::vector <-> '[4,5,6]'::vector AS cosine_distance;

-- Test vector indexing capability
CREATE TEMP TABLE test_vectors (id serial, embedding vector(3));
CREATE INDEX ON test_vectors USING ivfflat (embedding vector_cosine_ops);
DROP TABLE test_vectors;
```

**Expected Results**:
- Extension shows version (e.g., 0.7.4)
- Test vector displays: `[1,2,3]`
- Cosine distance returns a numeric value
- Index creates without errors

---

## Next Steps

Once pgvector is successfully installed:

1. Run database migration:
   ```bash
   psql -h localhost -U postgres -d tpedb -f tpe-database/migrations/phase-0-hybrid-search.sql
   ```

2. Verify migration:
   ```sql
   SELECT column_name, data_type
   FROM information_schema.columns
   WHERE table_name = 'entity_embeddings'
   ORDER BY ordinal_position;
   ```

3. Proceed with Phase 0 implementation:
   - Create knowledge content assembler service
   - Implement embedding generation service
   - Build hybrid search service
   - Index existing knowledge base

---

## References

- **pgvector GitHub**: https://github.com/pgvector/pgvector
- **pgvector Releases**: https://github.com/pgvector/pgvector/releases
- **pgvector Documentation**: https://github.com/pgvector/pgvector#readme
- **PostgreSQL Extensions**: https://www.postgresql.org/docs/16/external-extensions.html
