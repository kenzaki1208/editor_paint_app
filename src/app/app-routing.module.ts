import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PaintAppComponent } from './components/paint_app/paint_app.component';

const routes: Routes = [
  {
    component: PaintAppComponent,
    path: 'paint',
    title: 'Paint App'
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
