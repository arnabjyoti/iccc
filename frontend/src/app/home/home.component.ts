import { Component, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { VehicleService } from '../vehicle.service';
import * as L from 'leaflet';
import 'leaflet-rotatedmarker';

interface TrackedMarker extends L.Marker {
  _currentAngle?: number;
  _targetAngle?: number;
  _targetPos?: L.LatLng;
  _speedKmh?: number;
  _isMoving?: boolean;
}

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
})
export class HomeComponent implements OnInit, OnDestroy, AfterViewInit {
  map!: L.Map;
  markers: Record<string, TrackedMarker> = {};
  loading: boolean = true;
  private animationLoopId: number | null = null;

  constructor(private vehicleService: VehicleService) {}

  ngOnInit(): void {}

  ngAfterViewInit(): void {
    // 1. Initialize Map exactly with default zoom placement (top-left)
    this.map = L.map('map', {
      zoomControl: true,
      attributionControl: false
    }).setView([26.1445, 91.7362], 12);

    // 2. Exact standard OpenStreetMap tile layer from your screenshot (Free, no API key watermark)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      subdomains: ['a', 'b', 'c']
    }).addTo(this.map);

    // 3. Start smooth movement engine
    this.startContinuousEngine();

    // 4. Data stream listener
    this.vehicleService.onVehicleUpdate((data: any[]) => {
      if (this.loading && data && data.length > 0) {
        this.loading = false;
      }
      this.updateVehicles(data || []);
    });
  }

  updateVehicles(data: any[]): void {
    data.forEach((vehicle) => {
      if (!vehicle.Latitude || !vehicle.Longitude || !vehicle.BoxId) return;

      const lat = Number(vehicle.Latitude);
      const lng = Number(vehicle.Longitude);
      const id = String(vehicle.BoxId);
      const speedKmh = Number(vehicle.Speed) || 0;
      const isMoving = vehicle.VehicleStatus === 'Moving' && speedKmh > 3;

      const icon = L.icon({
        iconUrl: isMoving ? 'assets/bus-green.png' : 'assets/bus-red.png',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -16]
      });

      const popupContent = `
        <div style="font-size: 13px; line-height: 1.4;">
          <b>${vehicle.VehName || 'Vehicle ' + id}</b><br/>
          Speed: <b>${speedKmh} km/h</b><br/>
          Status: <span style="color: ${isMoving ? '#16a34a' : '#dc2626'}"><b>${vehicle.VehicleStatus}</b></span><br/>
          Location: ${vehicle.Location || 'Guwahati'}
        </div>
      `;

      if (this.markers[id]) {
        const marker = this.markers[id];
        marker.setIcon(icon);
        marker.getPopup()?.setContent(popupContent);

        const curPos = marker.getLatLng();
        const newPos = L.latLng(lat, lng);
        const distanceMeters = curPos.distanceTo(newPos);

        // Only rotate if real movement occurs (> 10m) to stop in-place spin
        if (isMoving && distanceMeters >= 10) {
          marker._targetAngle = this.getBearing(curPos, newPos);
        }

        marker._targetPos = newPos;
        marker._speedKmh = speedKmh;
        marker._isMoving = isMoving;
      } else {
        const marker = L.marker([lat, lng], {
          icon,
          rotationAngle: 0,
          rotationOrigin: 'center'
        } as any) as TrackedMarker;

        marker.bindPopup(popupContent);
        marker._currentAngle = 0;
        marker._targetAngle = 0;
        marker._targetPos = L.latLng(lat, lng);
        marker._speedKmh = speedKmh;
        marker._isMoving = isMoving;

        marker.addTo(this.map);
        this.markers[id] = marker;
      }
    });
  }

  startContinuousEngine(): void {
    const loop = () => {
      Object.values(this.markers).forEach((marker) => {
        if (!marker._isMoving || !marker._targetPos) return;

        const cur = marker.getLatLng();
        const target = marker._targetPos;

        // Smoothly rotate toward heading
        if (typeof marker._targetAngle === 'number') {
          marker._currentAngle = this.interpolateAngle(
            marker._currentAngle ?? 0,
            marker._targetAngle,
            0.1
          );
          (marker as any).setRotationAngle(marker._currentAngle);
        }

        // Smooth position glide (Lerp)
        const dLat = target.lat - cur.lat;
        const dLng = target.lng - cur.lng;

        if (Math.hypot(dLat, dLng) > 0.000015) {
          marker.setLatLng([
            cur.lat + dLat * 0.08,
            cur.lng + dLng * 0.08
          ]);
        }
      });

      this.animationLoopId = requestAnimationFrame(loop);
    };

    this.animationLoopId = requestAnimationFrame(loop);
  }

  getBearing(start: L.LatLng, end: L.LatLng): number {
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const toDeg = (rad: number) => (rad * 180) / Math.PI;

    const lat1 = toRad(start.lat);
    const lon1 = toRad(start.lng);
    const lat2 = toRad(end.lat);
    const lon2 = toRad(end.lng);

    const dLon = lon2 - lon1;
    const y = Math.sin(dLon) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);

    return (toDeg(Math.atan2(y, x)) + 360) % 360;
  }

  interpolateAngle(start: number, end: number, factor: number): number {
    let diff = (end - start) % 360;
    if (diff < -180) diff += 360;
    if (diff > 180) diff -= 360;

    if (Math.abs(diff) < 0.5) return end;
    return (start + diff * factor + 360) % 360;
  }

  ngOnDestroy(): void {
    if (this.animationLoopId) {
      cancelAnimationFrame(this.animationLoopId);
    }
  }
}