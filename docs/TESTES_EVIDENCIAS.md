# Matriz real de validação

| Teste | Resultado | Limites |
|---|---|---|
| Node logic + OAuth + integração simulada | 44/44 **PASSOU** | Testes locais; Auth/REST simulados no teste de dois usuários |
| Chromium 360 px | **PASSOU** | Renderização sintética do legado sem servidor |
| Chromium 390 px | **PASSOU** | Renderização sintética do legado sem servidor |
| Chromium 430 px | **PASSOU** | Renderização sintética do legado sem servidor |
| Chromium onboarding → lista → item → Compra → Histórico → Nota | **PASSOU** | Navegação/UX original com identidade simulada |
| Supabase DB com dois atores fictícios em BEGIN/ROLLBACK | **PASSOU** | lumo_ensure_list, rename, RLS, delete, anti-takeover; 0 registros de teste persistidos |
| Login Google na Beta anterior | **PASSOU** | Capturas do usuário + 1 identidade Google no DB |
| Login Google real na UX restaurada | **NÃO TESTADO** | Precisa novo preview HTTPS e redirect permitido |
| Duas contas reais editando mesma lista | **NÃO TESTADO** | Requer dois celulares |
| Scanner câmera Android | **NÃO TESTADO** | Código recuperado, hardware ainda não homologado |
| Nota fiscal real via QR/HTML/PDF/XML/foto | **NÃO TESTADO** | Não enviar dados pessoais |
| Navegador real + HTTP local nesta execução | **BLOQUEADO** | Chrome: `net::ERR_BLOCKED_BY_ADMINISTRATOR` |
| Pré-visualização Firebase UX restaurada | **NÃO PUBLICADA** | Canal `ux-restored` a criar pelo Cloud Shell |

**Evidências locais:** `lumo_original_ux_360.png`, `lumo_original_ux_390.png`, `lumo_original_ux_430.png`, `lumo_restored_list_390.png` no pacote de entrega.
