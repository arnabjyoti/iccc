import { Injectable } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { HttpClient } from '@angular/common/http';
import { AppService } from 'src/app/app.service';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class HomeService {
  public accessKeyword:any=null;
  public headers: any;
  constructor(
    private toastr: ToastrService,
    private appService: AppService,
    private http: HttpClient,
  ) { 
    let token = JSON.parse(JSON.stringify(localStorage.getItem('token')));
    token = JSON.parse(token);
    this.accessKeyword = token.usr.accessKeyword;
  }

  getDashboardCounts(callback: any) {
  const ENDPOINT = `${environment.BASE_URL}/api/getDashboardCounts`;

  this.http.get(ENDPOINT, { headers: this.headers }).subscribe(
    (response: any) => {
      return callback && callback(null, response);
    },
    (error) => {
      return callback && callback(error, null);
    }
  );
}

}
