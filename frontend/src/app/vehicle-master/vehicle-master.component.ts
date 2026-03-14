import { Component, OnInit } from '@angular/core';
import { VehicleService } from './vehicle-master.service';

declare var $: any;

@Component({
  selector: 'app-vehicle-master',
  templateUrl: './vehicle-master.component.html',
  styleUrls: ['./vehicle-master.component.css']
})
export class VehicleMasterComponent implements OnInit {

  vehicles: any[] = [];
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

  constructor(private vehicleService: VehicleService) {}

  ngOnInit(): void {

    this.getVehicleData();

    this.today = new Date().toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    this.loadOperators();
    this.loadDrivers();
    this.getRoutes();

  }


  getVehicleData() {

  this.loading = true;

  this.vehicleService.getVehicles().subscribe({

    next: (apiVehicles) => {

      this.vehicleService.getVehicleMaster().subscribe({

        next: (dbVehicles) => {

          this.vehicles = apiVehicles.map((api: any) => {

            const db = dbVehicles.find(
              (d: any) => d.vehicle_no == api.VehName
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

          })
          .sort((a:any,b:any)=> a.VehName.localeCompare(b.VehName));

          // ⭐ initial table data
          this.filteredVehicles = [...this.vehicles];

          /* --------- CALCULATE DASHBOARD STATS -------- */

          this.totalVehicles = this.vehicles.length;

          this.activeVehicles =
            this.vehicles.filter(v => v.VehicleStatus === "Moving").length;

          this.stoppedVehicles =
            this.vehicles.filter(v => v.VehicleStatus === "Stopped").length;

          this.unreachableVehicles =
            this.vehicles.filter(v => v.VehicleStatus === "Unreachable").length;

          this.loading = false;

        }

      });

    }

  });

}

/* ---------- SEARCH VEHICLE ---------- */

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


  /* ---------- OPEN MODAL ---------- */

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


  /* ---------- SAVE VEHICLE ---------- */

  saveVehicle() {

    this.vehicleService.saveVehicle(this.selectedVehicle)
      .subscribe({

        next: () => {

          alert("Vehicle saved successfully");

          $('#vehicleModal').modal('hide');

          this.getVehicleData();

        },

        error: (err) => {
          console.log(err);
        }

      });

  }


  /* ---------- UPDATE VEHICLE ---------- */

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

  updateVehicleModal(){

this.vehicleService.updateVehicle(this.selectedVehicle)
.subscribe({

next:()=>{

alert("Vehicle updated successfully");

$('#vehicleModal').modal('hide');

this.getVehicleData();

},

error:(err)=>{

console.log(err);

}

});

}


  /* ---------- LOAD OPERATORS ---------- */

  loadOperators() {

    this.vehicleService.getOperators().subscribe({

      next: (res) => {
        this.operators = res;
      },

      error: (err) => {
        console.log(err);
      }

    });

  }


  /* ---------- LOAD DRIVERS ---------- */

  loadDrivers() {

    this.vehicleService.getDrivers().subscribe({

      next: (res) => {
        this.drivers = res;
      },

      error: (err) => {
        console.log(err);
      }

    });

  }

   /* ---------- LOAD ROUTES ---------- */

  getRoutes(){

  this.vehicleService.getRoutes()
  .subscribe((data:any)=>{

    this.routes = data;

  });

}


  /* ---------- FORMAT DATE ---------- */

  formatDate(date: string) {

    return new Date(date).toLocaleString();

  }

}