import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { HierarchyComponent } from './hierarchy/hierarchy.component';
import { TpsComponent } from './tps/tps.component';
import { RegistrasiComponent } from './registrasi/registrasi.component';
import { FotoComponent } from './foto/foto.component';
import { AuthGuardService } from './auth-guard.service';
import { USER_ROLE } from 'shared';
import { ProfileComponent } from './profile/profile.component';
import { ApproverComponent } from './approver/approver.component';
import { HomeComponent } from './home/home.component';
import { ScoreboardComponent } from './scoreboard/scoreboard.component';

const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    component: HomeComponent
  },
  {
    path: 'h/:id',
    component: HierarchyComponent,
    canActivate: [AuthGuardService]
  },
  {
    path: 't/:id/:tpsNo',
    component: TpsComponent,
    canActivate: [AuthGuardService]
  },
  { path: 't/:id', component: TpsComponent, canActivate: [AuthGuardService] },
  {
    path: 'c/:code',
    component: RegistrasiComponent
  },
  { path: 'foto', component: FotoComponent, canActivate: [AuthGuardService] },
  {
    path: 'p/:uid',
    component: ProfileComponent,
    canActivate: [AuthGuardService],
    data: {
      role: USER_ROLE.MODERATOR
    }
  },
  {
    path: 'scoreboard',
    component: ScoreboardComponent,
    canActivate: [AuthGuardService],
    data: {
      role: USER_ROLE.ADMIN
    }
  },
  {
    path: 'a/:kelId/:tpsNo/:imageId',
    component: ApproverComponent,
    canActivate: [AuthGuardService],
    data: {
      role: USER_ROLE.MODERATOR
    }
  },
  { path: '**', redirectTo: '' }
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { scrollPositionRestoration: 'enabled' })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule {}
