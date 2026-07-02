import { Routes } from '@angular/router';
import { StartComponent } from './pages/start/start.component';
import { RoleSelectComponent } from './pages/role-select/role-select.component';
import { GameComponent } from './pages/game/game.component';

export const routes: Routes = [
  { path: '', component: StartComponent },
  { path: 'roles', component: RoleSelectComponent },
  { path: 'game', component: GameComponent },
  { path: '**', redirectTo: '' }
];
