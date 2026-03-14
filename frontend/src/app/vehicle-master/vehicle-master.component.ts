import { Component, OnInit } from '@angular/core';
import { VehicleMasterService } from './vehicle-master.service';
import { VehicleService } from '../vehicle.service';

declare var $: any;

@Component({
  selector: 'app-vehicle-master',
  templateUrl: './vehicle-master.component.html',
  styleUrls: ['./vehicle-master.component.css']
})
export class VehicleMasterComponent implements OnInit {

  vehicles: any[] = [];
  dbVehicles: any[] = [];

  loading = false;

  selectedVehicle: any = {};
  routes:any[] = [];
  operators: any[] = [];
  drivers: any[] = [];

  today: string = '';

  totalVehicles = 0;
  activeVehicles = 0;
  stoppedVehicles = 0;
  unreachableVehicles = 0;

  filteredVehicles: any[] = [];
  searchText: string = '';

  constructor(
    private VehicleMasterService: VehicleMasterService,
    private vehicleService: VehicleService
  ) {}

  ngOnInit(): void {

    this.loading = true;

    this.today = new Date().toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    this.loadOperators();
    this.loadDrivers();
    this.getRoutes();

    // ⭐ Load DB vehicles once
    this.VehicleMasterService.getVehicleMaster().subscribe((db:any)=>{

      this.dbVehicles = db;

      // ⭐ Start listening to socket updates
      this.listenVehicleSocket();

    });

  }


/* =====================================================
   LIVE VEHICLE SOCKET
===================================================== */

listenVehicleSocket(){

  this.vehicleService.onVehicleUpdate((apiVehicles:any[])=>{

    this.vehicles = apiVehicles.map((api:any)=>{

      const db = this.dbVehicles.find(
        (d:any)=> d.vehicle_no == api.VehName
      );

      return {

        ...api,

        db_id: db?.id,
        division: db?.division,
        vehicle_type: db?.vehicle_type,
        capacity: db?.capacity,
        owner_name: db?.owner_name,

        route_id: db?.route_id,

        operator_id: db?.operator_id,
        driver_id: db?.driver_id,

        operator_name: db?.operator?.operator_name,
        driver_name: db?.driver?.driver_name,

        route_name: db?.route?.routeName

      };

    }).sort((a:any,b:any)=> a.VehName.localeCompare(b.VehName));


    this.filteredVehicles = [...this.vehicles];


    /* ---------- DASHBOARD STATS ---------- */

    this.totalVehicles = this.vehicles.length;

    this.activeVehicles =
      this.vehicles.filter(v => v.VehicleStatus === "Moving").length;

    this.stoppedVehicles =
      this.vehicles.filter(v => v.VehicleStatus === "Stopped").length;

    this.unreachableVehicles =
      this.vehicles.filter(v => v.VehicleStatus === "Unreachable").length;


    this.loading = false;

  });

}



/* =====================================================
   SEARCH VEHICLE
===================================================== */

searchVehicle() {

  const value = this.searchText.toLowerCase();

  this.filteredVehicles = this.vehicles.filter((v:any)=>

    v.VehName?.toLowerCase().includes(value) ||

    v.operator_name?.toLowerCase().includes(value) ||

    v.driver_name?.toLowerCase().includes(value) ||

    v.BoxId?.toLowerCase().includes(value) ||

    v.division?.toLowerCase().includes(value)

  );

}



/* =====================================================
   OPEN SAVE MODAL
===================================================== */

openSaveModal(v: any) {

  this.selectedVehicle = {

    vehicle_no: v.VehName,
    division: v.division,
    vehicle_type: v.vehicle_type,
    capacity: v.capacity,
    owner_name: v.owner_name,
    route_id: v.route_id,
    operator_id: v.operator_id,
    driver_id: v.driver_id,

    box_id: v.BoxId,
    speed: v.Speed,
    status: v.VehicleStatus,
    location: v.Location

  };

  $('#vehicleModal').modal('show');

}


/* =====================================================
   SAVE VEHICLE
===================================================== */

saveVehicle(){

  this.VehicleMasterService.saveVehicle(this.selectedVehicle)
  .subscribe({

    next:()=>{

      alert("Vehicle saved successfully");

      $('#vehicleModal').modal('hide');

      this.reloadDbVehicles();

    },

    error:(err)=>{

      console.log(err);

    }

  });

}


/* =====================================================
   OPEN UPDATE MODAL
===================================================== */

openUpdateModal(v:any){

  this.selectedVehicle = {

    id: v.db_id,
    vehicle_no: v.VehName,
    division: v.division,
    vehicle_type: v.vehicle_type,
    capacity: v.capacity,
    owner_name: v.owner_name,

    route_id: v.route_id,
    operator_id: v.operator_id,
    driver_id: v.driver_id,

    box_id: v.BoxId,
    speed: v.Speed,
    status: v.VehicleStatus,
    location: v.Location

  };

  $('#vehicleModal').modal('show');

}


/* =====================================================
   UPDATE VEHICLE
===================================================== */

updateVehicleModal(){

  this.VehicleMasterService.updateVehicle(this.selectedVehicle)
  .subscribe({

    next:()=>{

      alert("Vehicle updated successfully");

      $('#vehicleModal').modal('hide');

      this.reloadDbVehicles();

    },

    error:(err)=>{

      console.log(err);

    }

  });

}



/* =====================================================
   RELOAD DB VEHICLES
===================================================== */

reloadDbVehicles(){

  this.VehicleMasterService.getVehicleMaster()
  .subscribe((data:any)=>{

    this.dbVehicles = data;

  });

}



/* =====================================================
   LOAD OPERATORS
===================================================== */

loadOperators(){

  this.VehicleMasterService.getOperators().subscribe({

    next:(res)=>{

      this.operators = res;

    },

    error:(err)=>{

      console.log(err);

    }

  });

}



/* =====================================================
   LOAD DRIVERS
===================================================== */

loadDrivers(){

  this.VehicleMasterService.getDrivers().subscribe({

    next:(res)=>{

      this.drivers = res;

    },

    error:(err)=>{

      console.log(err);

    }

  });

}



/* =====================================================
   LOAD ROUTES
===================================================== */

getRoutes(){

  this.VehicleMasterService.getRoutes()
  .subscribe((data:any)=>{

    this.routes = data;

  });

}



/* =====================================================
   FORMAT DATE
===================================================== */

formatDate(date:string){

  return new Date(date).toLocaleString();

}

}