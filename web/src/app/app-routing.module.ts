import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { HierarchyComponent } from './hierarchy/hierarchy.component';
import { TpsComponent } from './tps/tps.component';
import { UploadSequenceComponent } from './upload-sequence/upload-sequence.component';
import { RegistrasiComponent } from './registrasi/registrasi.component';
import { DigitizeComponent } from './digitize/digitize.component';

const routes: Routes = [
  { path: '', redirectTo: '/c/0', pathMatch: 'full' },
  { path: 'h/:id', component: HierarchyComponent },
  { path: 't/:id', component: TpsComponent },
  { path: 'd/:id', component: DigitizeComponent },
  {
    path: 'u/:kelurahanId/:tpsNo',
    component: UploadSequenceComponent
  },
  { path: 'c/:code', component: RegistrasiComponent }
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { scrollPositionRestoration: 'enabled' })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule {}
