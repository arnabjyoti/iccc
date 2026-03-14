import { Component, OnInit } from '@angular/core';
import { VehicleRoutesService } from './vehicle-routes.service';

declare var $:any;

@Component({
  selector: 'app-vehicle-routes',
  templateUrl: './vehicle-routes.component.html',
  styleUrls: ['./vehicle-routes.component.css']
})
export class VehicleRoutesComponent implements OnInit {

  routes:any[] = [];

  selectedRoute:any = {};

  constructor(private routeService:VehicleRoutesService){}

  ngOnInit(): void {

    this.getRoutes();

  }


  getRoutes(){

    this.routeService.getVehicleRoutes()
    .subscribe((data:any)=>{

      this.routes = data;

      console.log("ccc",data);
      

    });

  }


  openAddModal(){

    this.selectedRoute = {};

    $('#formModal').modal('show');

  }


  openEditModal(route:any){

    this.selectedRoute = {...route};

    console.log("bbbb",this.selectedRoute);
    

    $('#formModal').modal('show');

  }


  saveRoute(){

    this.routeService.saveRoute(this.selectedRoute)
    .subscribe(()=>{

      alert("Route saved");

      $('#formModal').modal('hide');

      this.getRoutes();

    });

  }


  updateRoute(){

    this.routeService.updateRoute(this.selectedRoute)
    .subscribe(()=>{

      alert("Route updated");

      $('#formModal').modal('hide');

      this.getRoutes();

    });

  }


  deleteRoute(id:number){

    const data = {

      requestObject:{ id:id }

    };

    this.routeService.deleteRoute(data)
    .subscribe(()=>{

      alert("Route deleted");

      this.getRoutes();

    });

  }

}