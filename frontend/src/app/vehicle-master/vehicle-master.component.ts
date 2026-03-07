import { Component, OnInit } from '@angular/core';
import { Vehicle } from '../models/vehicle.model';
import { VehicleService } from './vehicle-master.service';


@Component({
  selector: 'app-vehicle-master',
  templateUrl: './vehicle-master.component.html',
  styleUrls: ['./vehicle-master.component.css']
})
export class VehicleMasterComponent implements OnInit {

  vehicles: Vehicle[] = [];
  loading = false;

  constructor(private vehicleService: VehicleService) {}

  ngOnInit(): void {
    this.getVehicleData();
  }

  getVehicleData() {
    this.loading = true;
    this.vehicleService.getVehicles().subscribe({
      next: (res) => {
        this.vehicles = res;
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.loading = false;
      }
    });
  }

  formatDate(date: string) {
    return new Date(date).toLocaleString();
  }
}
