import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';

@Injectable({
  providedIn: 'root'
})
export class VehicleService {

  private socket: Socket;

  constructor() {

    this.socket = io('http://localhost:8800', {
      transports: ['websocket'],
      autoConnect: true
    });

  }

  onVehicleUpdate(callback: (data: any) => void) {

    // ⭐ REMOVE OLD LISTENER BEFORE ADDING NEW
    this.socket.off('vehicleLocation');

    this.socket.on('vehicleLocation', callback);
  }

}