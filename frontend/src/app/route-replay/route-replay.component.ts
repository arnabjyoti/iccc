import { Component, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { RouteReplayService } from './route-replay.service';
import { VehicleService } from '../vehicle.service';
import { HttpClient } from '@angular/common/http';
import * as L from 'leaflet';
import 'leaflet-rotatedmarker';

interface HistoricalPoint {
  BoxId?: string;
  VehName?: string;
  Latitude: string | number;
  Longitude: string | number;
  Speed?: number;
  VehicleStatus?: string;
  Location?: string;
  Lastdate?: string;
}

@Component({
  selector: 'app-route-replay',
  templateUrl: './route-replay.component.html',
  styleUrls: ['./route-replay.component.css']
})
export class RouteReplayComponent implements OnInit, OnDestroy, AfterViewInit {
  map!: L.Map;
  loading: boolean = false;
  loadingText: string = 'Loading...';
  showLegend: boolean = false;

  // Tile layers
  activeLayer: 'streets' | 'satellite' = 'streets';
  private streetLayer!: L.TileLayer;
  private satelliteLayer!: L.TileLayer;

  // Filter Models
  vehicleList: any[] = [];
  selectedBoxId: string = '';
  selectedDate: string = new Date().toISOString().split('T')[0];

  // Raw & Snapped Coordinates
  rawCoordinates: HistoricalPoint[] = [];
  snappedPoints: L.LatLng[] = [];
  currentIndex: number = 0;

  // Animation States
  isPlaying: boolean = false;
  playbackMultiplier: number = 1;
  followVehicle: boolean = true;
  activePoint: HistoricalPoint | null = null;
  private animFrameId: number | null = null;
  private lastAnimTime: number = 0;

  // Map Overlays
  private fullRouteLine: L.Polyline | null = null;
  private coveredRouteLine: L.Polyline | null = null;
  private playbackMarker: any = null;
  private startMarker: L.Marker | null = null;
  private endMarker: L.Marker | null = null;

  constructor(
    private routeReplayService: RouteReplayService,
    private vehicleService: VehicleService,
    private http: HttpClient
  ) {}

  ngOnInit(): void {}

  ngAfterViewInit(): void {
    // 1. Initialize Map
    this.map = L.map('replay-map', {
      zoomControl: true,
      attributionControl: false
    }).setView([26.1445, 91.7362], 13);

    this.streetLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      subdomains: ['a', 'b', 'c']
    });

    this.satelliteLayer = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      { maxZoom: 19 }
    );

    this.streetLayer.addTo(this.map);

    setTimeout(() => {
      this.map.invalidateSize();
    }, 250);

    // 2. Fetch vehicles, sort A-Z, and maintain sticky selection
    this.vehicleService.onVehicleUpdate((data: any[]) => {
      if (data && data.length > 0) {
        const sortedData = [...data].sort((a, b) => {
          const nameA = (a.VehName || '').trim().toUpperCase();
          const nameB = (b.VehName || '').trim().toUpperCase();
          return nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: 'base' });
        });

        this.vehicleList = sortedData;

        if (!this.selectedBoxId && this.vehicleList.length > 0) {
          this.selectedBoxId = this.vehicleList[0].BoxId;
        }
      }
    });
  }

  toggleLegend(): void {
    this.showLegend = !this.showLegend;
  }

  switchLayer(type: 'streets' | 'satellite'): void {
    this.activeLayer = type;
    if (type === 'satellite') {
      this.map.removeLayer(this.streetLayer);
      this.satelliteLayer.addTo(this.map);
    } else {
      this.map.removeLayer(this.satelliteLayer);
      this.streetLayer.addTo(this.map);
    }
  }

  onRouteChange(): void {
    this.pause();
    this.clearMapLayers();
    this.rawCoordinates = [];
    this.snappedPoints = [];
    this.currentIndex = 0;
    this.activePoint = null;
  }

  loadRouteHistory(): void {
    if (!this.selectedBoxId) return;

    this.loading = true;
    this.loadingText = 'Fetching vehicle trip history...';
    this.pause();
    this.clearMapLayers();

    this.routeReplayService.getTravelHistory(this.selectedBoxId, this.selectedDate, (err: any, res: any) => {
      if (err) {
        this.loading = false;
        alert('Could not retrieve vehicle route history.');
        return;
      }

      const raw = Array.isArray(res) ? res : (res?.data || []);
      this.rawCoordinates = raw.filter(
        (p: any) => p.Latitude && p.Longitude && !isNaN(Number(p.Latitude))
      );

      if (this.rawCoordinates.length < 2) {
        this.loading = false;
        alert('Insufficient GPS logs recorded for this vehicle on this date.');
        return;
      }

      this.loadingText = 'Snapping route to road network...';
      this.snapCoordinatesToRoads(this.rawCoordinates);
    });
  }

  private snapCoordinatesToRoads(points: HistoricalPoint[]): void {
    const sampleChunk = points.filter((_, idx) => idx % Math.max(1, Math.floor(points.length / 80)) === 0);
    const coordString = sampleChunk.map(p => `${p.Longitude},${p.Latitude}`).join(';');
    const osrmUrl = `https://router.project-osrm.org/match/v1/driving/${coordString}?overview=full&geometries=geojson`;

    this.http.get(osrmUrl).subscribe({
      next: (response: any) => {
        this.loading = false;
        if (response?.matchings && response.matchings.length > 0) {
          const roadGeojsonCoords = response.matchings[0].geometry.coordinates;
          const roadPoints = roadGeojsonCoords.map((c: number[]) => L.latLng(c[1], c[0]));
          this.snappedPoints = this.densifyPath(roadPoints, 2);
        } else {
          const rawLatLngs = points.map(p => L.latLng(Number(p.Latitude), Number(p.Longitude)));
          this.snappedPoints = this.densifyPath(rawLatLngs, 2);
        }
        this.initRouteVisuals();
      },
      error: () => {
        this.loading = false;
        const rawLatLngs = points.map(p => L.latLng(Number(p.Latitude), Number(p.Longitude)));
        this.snappedPoints = this.densifyPath(rawLatLngs, 2);
        this.initRouteVisuals();
      }
    });
  }

  private densifyPath(points: L.LatLng[], maxStepMeters: number = 2): L.LatLng[] {
    const dense: L.LatLng[] = [];
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];
      const dist = p1.distanceTo(p2);
      const steps = Math.max(1, Math.ceil(dist / maxStepMeters));

      for (let s = 0; s < steps; s++) {
        const factor = s / steps;
        dense.push(L.latLng(
          p1.lat + (p2.lat - p1.lat) * factor,
          p1.lng + (p2.lng - p1.lng) * factor
        ));
      }
    }
    if (points.length > 0) dense.push(points[points.length - 1]);
    return dense;
  }

  initRouteVisuals(): void {
    if (this.snappedPoints.length === 0) return;

    // 1. Full Planned/Recorded Road Line (Grey)
    this.fullRouteLine = L.polyline(this.snappedPoints, {
      color: '#94a3b8',
      weight: 5,
      opacity: 0.65,
      lineCap: 'round'
    }).addTo(this.map);

    // 2. Active Covered Trail (Bright Green)
    this.coveredRouteLine = L.polyline([], {
      color: '#10b981',
      weight: 6,
      opacity: 0.95,
      lineCap: 'round'
    }).addTo(this.map);

    // 3. Start & End Badges (A and B Pins)
    const startIcon = L.divIcon({
      className: 'custom-route-pin pin-start',
      html: `<span>A</span>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14]
    });

    const endIcon = L.divIcon({
      className: 'custom-route-pin pin-end',
      html: `<span>B</span>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14]
    });

    const startPoint = this.snappedPoints[0];
    const endPoint = this.snappedPoints[this.snappedPoints.length - 1];

    this.startMarker = L.marker(startPoint, { icon: startIcon })
      .bindPopup('<b>Trip Start Point</b>')
      .addTo(this.map);

    this.endMarker = L.marker(endPoint, { icon: endIcon })
      .bindPopup('<b>Trip Destination</b>')
      .addTo(this.map);

    // 4. Moving Replay Bus Marker
    const busIcon = L.icon({
      iconUrl: 'assets/bus-green.png',
      iconSize: [34, 34],
      iconAnchor: [17, 17]
    });

    this.playbackMarker = (L.marker(this.snappedPoints[0], {
      icon: busIcon,
      rotationAngle: 0,
      rotationOrigin: 'center'
    } as any) as any).addTo(this.map);

    this.map.fitBounds(this.fullRouteLine.getBounds(), { padding: [50, 50] });

    this.currentIndex = 0;
    this.renderCurrentFrame();
  }

  private animateReplay = (timestamp: number): void => {
    if (!this.isPlaying) return;

    if (!this.lastAnimTime) this.lastAnimTime = timestamp;
    const delta = timestamp - this.lastAnimTime;

    const stepAdvance = Math.max(1, Math.round((delta / 16) * this.playbackMultiplier * 2));

    this.currentIndex = Math.min(this.currentIndex + stepAdvance, this.snappedPoints.length - 1);
    this.renderCurrentFrame();
    this.lastAnimTime = timestamp;

    if (this.currentIndex < this.snappedPoints.length - 1) {
      this.animFrameId = requestAnimationFrame(this.animateReplay);
    } else {
      this.pause();
    }
  };

  renderCurrentFrame(): void {
    if (!this.snappedPoints || this.snappedPoints.length === 0) return;

    const curLatLng = this.snappedPoints[this.currentIndex];

    const rawProgress = Math.floor((this.currentIndex / this.snappedPoints.length) * this.rawCoordinates.length);
    this.activePoint = this.rawCoordinates[Math.min(rawProgress, this.rawCoordinates.length - 1)];

    if (this.playbackMarker) {
      this.playbackMarker.setLatLng(curLatLng);

      const lookAhead = Math.min(this.currentIndex + 4, this.snappedPoints.length - 1);
      if (this.currentIndex < lookAhead) {
        const nextLatLng = this.snappedPoints[lookAhead];
        const bearing = this.getBearing(curLatLng, nextLatLng);
        this.playbackMarker.setRotationAngle(bearing);
      }
    }

    this.coveredRouteLine?.setLatLngs(this.snappedPoints.slice(0, this.currentIndex + 1));

    if (this.followVehicle) {
      this.map.panTo(curLatLng, { animate: false });
    }
  }

  togglePlay(): void {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  play(): void {
    if (this.currentIndex >= this.snappedPoints.length - 1) {
      this.currentIndex = 0;
    }
    this.isPlaying = true;
    this.lastAnimTime = 0;
    this.animFrameId = requestAnimationFrame(this.animateReplay);
  }

  pause(): void {
    this.isPlaying = false;
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  adjustSpeed(direction: number): void {
    const speeds = [0.5, 1, 2, 4, 8];
    let idx = speeds.indexOf(this.playbackMultiplier);
    if (direction > 0 && idx < speeds.length - 1) idx++;
    if (direction < 0 && idx > 0) idx--;
    this.playbackMultiplier = speeds[idx];
  }

  stepForward(): void {
    this.currentIndex = Math.min(this.currentIndex + 100, this.snappedPoints.length - 1);
    this.renderCurrentFrame();
  }

  stepBackward(): void {
    this.currentIndex = Math.max(this.currentIndex - 100, 0);
    this.renderCurrentFrame();
  }

  resetReplay(): void {
    this.pause();
    this.currentIndex = 0;
    this.renderCurrentFrame();
  }

  onSeek(event: any): void {
    this.currentIndex = Number(event.target.value);
    this.renderCurrentFrame();
  }

  toggleFollow(): void {
    this.followVehicle = !this.followVehicle;
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

  clearMapLayers(): void {
    if (this.fullRouteLine) this.map.removeLayer(this.fullRouteLine);
    if (this.coveredRouteLine) this.map.removeLayer(this.coveredRouteLine);
    if (this.playbackMarker) this.map.removeLayer(this.playbackMarker);
    if (this.startMarker) this.map.removeLayer(this.startMarker);
    if (this.endMarker) this.map.removeLayer(this.endMarker);
  }

  ngOnDestroy(): void {
    this.pause();
  }
}