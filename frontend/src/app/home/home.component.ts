import { Component, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { VehicleService } from '../vehicle.service';
import * as L from 'leaflet';
import 'leaflet-rotatedmarker';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
})
export class HomeComponent implements OnInit, OnDestroy, AfterViewInit {

  map: any;
  markers: any = {};

  loading: boolean = true;

  constructor(private vehicleService: VehicleService) {}

  ngOnInit(): void {}

  ngAfterViewInit() {

    this.map = L.map('map').setView([26.1445, 91.7362], 12);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap'
    }).addTo(this.map);

    this.vehicleService.onVehicleUpdate((data) => {

      if (this.loading && data.length > 0) {
        this.loading = false;   // ⭐ hide loader when first data comes
      }

      this.updateVehicles(data);
    });

  }

  // 🚀 MAIN UPDATE FUNCTION
  updateVehicles(data: any[]) {

    data.forEach(vehicle => {

      if (!vehicle.Latitude || !vehicle.Longitude) return;

      const lat = Number(vehicle.Latitude);
      const lng = Number(vehicle.Longitude);
      const id = vehicle.BoxId;

      const icon = L.icon({
        iconUrl: vehicle.VehicleStatus === 'Moving'
          ? 'assets/bus-green.png'
          : 'assets/bus-red.png',
        iconSize: [40, 40],
        iconAnchor: [20, 20]
      });

      // ⭐ If marker exists → animate
      if (this.markers[id]) {

        this.animateMarker(this.markers[id], [lat, lng]);

      } else {

        // ⭐ Create new marker
        const marker = L.marker([lat, lng], {
          icon,
          rotationAngle: 0,
          rotationOrigin: 'center'
        } as any).addTo(this.map);

        marker.bindPopup(`
          <b>${vehicle.VehName}</b><br>
          Speed: ${vehicle.Speed} km/h<br>
          Status: ${vehicle.VehicleStatus}<br>
          Location: ${vehicle.Location}
        `);

        this.markers[id] = marker;
      }

    });
  }

  // 🧭 Calculate direction
  getBearing(start: L.LatLng, end: L.LatLng) {

    const toRad = (deg: number) => deg * Math.PI / 180;
    const toDeg = (rad: number) => rad * 180 / Math.PI;

    const lat1 = toRad(start.lat);
    const lon1 = toRad(start.lng);
    const lat2 = toRad(end.lat);
    const lon2 = toRad(end.lng);

    const dLon = lon2 - lon1;

    const y = Math.sin(dLon) * Math.cos(lat2);
    const x =
      Math.cos(lat1) * Math.sin(lat2) -
      Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);

    return (toDeg(Math.atan2(y, x)) + 360) % 360;
  }

  // 🚀 Smooth movement + rotation
  animateMarker(marker: any, newLatLng: L.LatLngExpression) {

  // 🛑 Stop previous animation
  if (marker._moveInterval) {
    clearInterval(marker._moveInterval);
  }

  const start = marker.getLatLng();
  const end = L.latLng(newLatLng);

  // ⭐ CHECK IF VEHICLE ACTUALLY MOVED
  if (start.lat === end.lat && start.lng === end.lng) {
    return; // 🚫 No movement → keep current direction
  }

  // 🧭 Calculate direction
  const bearing = this.getBearing(start, end);

  // ⭐ SAVE LAST ANGLE
  marker._lastAngle = bearing;

  marker.setRotationAngle(bearing);

  const duration = 2000;
  const frames = 60;
  const interval = duration / frames;

  let frame = 0;

  marker._moveInterval = setInterval(() => {

    frame++;

    const lat = start.lat + (end.lat - start.lat) * (frame / frames);
    const lng = start.lng + (end.lng - start.lng) * (frame / frames);

    marker.setLatLng([lat, lng]);

    if (frame >= frames) {
      clearInterval(marker._moveInterval);
    }

  }, interval);
}

  ngOnDestroy(): void {}
}