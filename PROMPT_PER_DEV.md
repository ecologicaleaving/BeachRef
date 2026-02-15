# Prompt da Copiare per il Dev

---

**Ciao! BeachRef torna a usare il database originale su Supabase Cloud.**

## Quick Task 📋

1. **Vai sul dashboard Supabase**: https://app.supabase.com/project/peofucnjgcrgswzqslpb/settings/api
   
2. **Copia le credenziali**:
   - Project URL: `https://peofucnjgcrgswzqslpb.supabase.co`
   - Anon/public key (quella lunga che inizia con `eyJhbGciOiJ...`)

3. **Aggiorna** `beach_ref_flutter/.env.prod`:
   ```
   SUPABASE_URL=https://peofucnjgcrgswzqslpb.supabase.co
   SUPABASE_ANON_KEY=<anon-key-copiata-da-dashboard>
   ENV=production
   ```

4. **Testa**:
   ```bash
   cd beach_ref_flutter
   ./scripts/run_prod.sh
   ```

5. **Verifica** che l'app:
   - Si connetta a Supabase Cloud (non localhost)
   - Carichi matches/tournaments esistenti
   - Sync VIS funzioni

## Perché?
Avevamo provato con VPS per test, ma per produzione usiamo Supabase Cloud:
- ✅ Managed, veloce, backup automatici
- ✅ Database già popolato (~4000 matches)
- ✅ Free tier sufficiente, zero manutenzione

**Guida completa**: Leggi `beach_ref_flutter/REVERT_TO_CLOUD.md` se hai dubbi.

**Domande?** Chiedi pure!

---
