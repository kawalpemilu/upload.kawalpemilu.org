import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { HierarchyComponent } from './hierarchy/hierarchy.component';

const routes: Routes = [
  { path: '', redirectTo: '/h/0', pathMatch: 'full' },
  { path: 'h/:id', component: HierarchyComponent }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}
