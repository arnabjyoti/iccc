import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef, HostListener } from '@angular/core';
import { HomeService } from './home.service';
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
  @ViewChild('mapWrapper') mapWrapperRef!: ElementRef;

  map!: L.Map;
  markers: Record<string, TrackedMarker> = {};
  loading: boolean = true;
  isFullscreen: boolean = false;
  private animationLoopId: number | null = null;

  constructor(
    private homeService: HomeService,
    private vehicleService: VehicleService
  ) {}

  ngOnInit(): void {}

  ngAfterViewInit(): void {
    // 1. Initialize Map
    this.map = L.map('map', {
      zoomControl: true,
      attributionControl: false
    }).setView([26.1445, 91.7362], 12);

    // 2. OpenStreetMap Tile Layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      subdomains: ['a', 'b', 'c']
    }).addTo(this.map);

    setTimeout(() => {
      this.map.invalidateSize();
    }, 200);

    // 3. Start smooth movement engine
    this.startContinuousEngine();

    // 4. Instant restoration from service cache if returning from another page
    if (this.homeService.lastFleetData && this.homeService.lastFleetData.length > 0) {
      this.loading = false;
      this.updateVehicles(this.homeService.lastFleetData);
    }

    // 5. Data stream listener
    this.vehicleService.onVehicleUpdate((data: any[]) => {
      if (this.loading && data && data.length > 0) {
        this.loading = false;
      }
      this.homeService.lastFleetData = data || [];
      this.updateVehicles(data || []);
    });
  }

  // ⭐ Toggle Native Fullscreen Mode
  toggleFullscreen(): void {
    const elem = this.mapWrapperRef.nativeElement;

    if (!document.fullscreenElement) {
      if (elem.requestFullscreen) {
        elem.requestFullscreen();
      } else if ((elem as any).webkitRequestFullscreen) {
        (elem as any).webkitRequestFullscreen();
      } else if ((elem as any).msRequestFullscreen) {
        (elem as any).msRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
      } else if ((document as any).msExitFullscreen) {
        (document as any).msExitFullscreen();
      }
    }
  }

  // ⭐ Recalculate Leaflet map dimensions on fullscreen enter/exit (including Esc key)
  @HostListener('document:fullscreenchange', ['$event'])
  @HostListener('document:webkitfullscreenchange', ['$event'])
  @HostListener('document:mozfullscreenchange', ['$event'])
  @HostListener('document:MSFullscreenChange', ['$event'])
  onFullscreenChange(): void {
    this.isFullscreen = !!document.fullscreenElement;
    setTimeout(() => {
      if (this.map) {
        this.map.invalidateSize();
      }
    }, 250);
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
        <div class="custom-popup">
          <div class="popup-title">${vehicle.VehName || 'Vehicle ' + id}</div>
          <div class="popup-badge ${isMoving ? 'status-moving' : 'status-stopped'}">
            ${vehicle.VehicleStatus}
          </div>
          <div class="popup-stat"><span>Speed:</span> <b>${speedKmh} km/h</b></div>
          <div class="popup-stat"><span>Location:</span> <b>${vehicle.Location || 'Guwahati'}</b></div>
        </div>
      `;

      if (this.markers[id]) {
        const marker = this.markers[id];
        marker.setIcon(icon);
        marker.getPopup()?.setContent(popupContent);

        const curPos = marker.getLatLng();
        const newPos = L.latLng(lat, lng);
        const distanceMeters = curPos.distanceTo(newPos);

        // Calculate bearing only if real movement occurs (> 8m)
        if (isMoving && distanceMeters >= 8) {
          const bearing = this.getBearing(curPos, newPos);
          marker._targetAngle = bearing;
          this.homeService.setVehicleCache(id, lat, lng, bearing);
        }

        marker._targetPos = newPos;
        marker._speedKmh = speedKmh;
        marker._isMoving = isMoving;
      } else {
        // Read cached angle so the marker instantly faces the correct direction
        const cached = this.homeService.getVehicleCache(id);
        let initialAngle = 0;

        if (cached) {
          initialAngle = cached.angle;
          const prevPos = L.latLng(cached.lat, cached.lng);
          const currentPos = L.latLng(lat, lng);
          if (prevPos.distanceTo(currentPos) >= 8) {
            initialAngle = this.getBearing(prevPos, currentPos);
          }
        }

        const marker = L.marker([lat, lng], {
          icon,
          rotationAngle: initialAngle,
          rotationOrigin: 'center'
        } as any) as TrackedMarker;

        marker.bindPopup(popupContent);
        marker._currentAngle = initialAngle;
        marker._targetAngle = initialAngle;
        marker._targetPos = L.latLng(lat, lng);
        marker._speedKmh = speedKmh;
        marker._isMoving = isMoving;

        marker.addTo(this.map);
        this.markers[id] = marker;
        this.homeService.setVehicleCache(id, lat, lng, initialAngle);
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