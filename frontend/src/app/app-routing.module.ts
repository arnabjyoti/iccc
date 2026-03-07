import { NgModule } from '@angular/core';
import { ExtraOptions, RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { AuthGuardService as AuthGuard } from "./auth/auth-gaurd.service";
import { LoginComponent } from './login/login.component';
import { VehicleMasterComponent } from './vehicle-master/vehicle-master.component';

const routes: Routes = [
  {
    path: "login",
    component: LoginComponent,
    data: { showTopNav: true },
  },
  {
    path: "home",
    component: HomeComponent,
    data: { showTopNav: true },
    canActivate: [AuthGuard]
  },
  {
    path: "vehicle-master",
    component: VehicleMasterComponent,
    data: { showTopNav: true },
    canActivate: [AuthGuard]
  },
  { path: "**", redirectTo: "home" }
];

const config: ExtraOptions = {
  useHash: true
};

@NgModule({
  imports: [RouterModule.forRoot(routes, { useHash: false })],
  exports: [RouterModule]
})
export class AppRoutingModule { }
