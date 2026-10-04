import '@fontsource/fredoka/400.css';
import '@fontsource/fredoka/600.css';
import './styles.css';
import { App } from './App';

const app = new App();
app.start().catch((e) => {
  console.error(e);
  const el = document.getElementById('app');
  if (el) el.innerHTML = `<div class="fatal">Erro ao iniciar / Startup error<br><small>${String(e)}</small></div>`;
});

// Exposto para depuração no navegador.
(window as unknown as { __app: App }).__app = app;
