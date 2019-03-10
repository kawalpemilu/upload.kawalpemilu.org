import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { HierarchyComponent } from './hierarchy/hierarchy.component';
import { TpsComponent } from './tps/tps.component';
import { UploadSequenceComponent } from './upload-sequence/upload-sequence.component';
import { RegistrasiComponent } from './registrasi/registrasi.component';
import { DigitizeComponent } from './digitize/digitize.component';
import { FotoComponent } from './foto/foto.component';
import { AuthGuardService } from './auth-guard.service';
import { LoginComponent } from './login/login.component';
import { USER_ROLE } from 'shared';
import { ProfileComponent } from './profile/profile.component';

const routes: Routes = [
  { path: '', redirectTo: '/c/0', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  {
    path: 'h/:id',
    component: HierarchyComponent,
    canActivate: [AuthGuardService]
  },
  { path: 't/:id', component: TpsComponent, canActivate: [AuthGuardService] },
  {
    path: 'u/:kelurahanId/:tpsNo',
    component: UploadSequenceComponent,
    canActivate: [AuthGuardService]
  },
  {
    path: 'c/:code',
    component: RegistrasiComponent,
    canActivate: [AuthGuardService]
  },
  { path: 'f', component: FotoComponent, canActivate: [AuthGuardService] },
  {
    path: 'p/:uid',
    component: ProfileComponent,
    canActivate: [AuthGuardService]
  },
  {
    path: 'd/:id',
    component: DigitizeComponent,
    canActivate: [AuthGuardService],
    data: {
      role: USER_ROLE.MODERATOR
    }
  },
  { path: '**', redirectTo: '/c/0' }
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { scrollPositionRestoration: 'enabled' })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule {}
