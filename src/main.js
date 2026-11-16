// ---------------------------------------------------------------------------
// PLAYZONE entry point: loads the styles, defines the routes and starts the app.
// ---------------------------------------------------------------------------
import './styles/theme.css';
import './styles/base.css';
import './styles/components.css';
import './styles/pages.css';

import { startRouter } from './router.js';
import { HomePage } from './pages/HomePage.js';
import { LocalSetupPage } from './pages/LocalSetupPage.js';
import { LocalGamesPage } from './pages/LocalGamesPage.js';
import { OnlinePage } from './pages/OnlinePage.js';
import { LobbyPage } from './pages/LobbyPage.js';
import { GamePage } from './pages/GamePage.js';
import { NotFoundPage } from './pages/NotFoundPage.js';

const routes = [
  { path: '/', page: () => HomePage() },
  { path: '/profile', page: () => HomePage({ scrollTo: 'profile' }) },
  { path: '/local', page: LocalSetupPage },
  { path: '/local/games', page: LocalGamesPage },
  { path: '/online', page: OnlinePage },
  { path: '/lobby/:code', page: LobbyPage },
  { path: '/play/:id', page: GamePage },
  { path: '/404', page: NotFoundPage },
];

try {
  startRouter(document.getElementById('app'), routes);
} catch (error) {
  console.error(error);
  document.getElementById('app').textContent = 'Something went wrong while starting PLAYZONE. Please refresh the page.';
}
