import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { HierarchyComponent } from './hierarchy/hierarchy.component';
import { TpsComponent } from './tps/tps.component';
import { UploadSequenceComponent } from './upload-sequence/upload-sequence.component';

const routes: Routes = [
  { path: '', redirectTo: '/h/0', pathMatch: 'full' },
  { path: 'h/:id', component: HierarchyComponent },
  { path: 't/:id', component: TpsComponent },
  {
    path: 'u/:kelurahanId/:tpsNo',
    component: UploadSequenceComponent
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}
