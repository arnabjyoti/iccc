import { Component, OnInit } from '@angular/core';
import { HomeService } from './home.service';
import { ToastrService } from 'ngx-toastr';
import { environment } from 'src/environments/environment';
import * as _ from 'lodash';
import * as XLSX from 'xlsx';
import * as moment from 'moment';
import { LoginService } from '../login/login.service';
import { NgxSpinnerService } from 'ngx-spinner';
// import {userInfo} from '../../helper/userinfo';

import { Chart } from 'chart.js/auto';
import { interval, Subscription } from 'rxjs';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
})
export class HomeComponent implements OnInit {
  totalBus = 0;
  totalDriver = 0;
  totalConductor = 0;
  totalRoute = 0;

  runningBus = 0;
  runningVehicle: any[] = [];
  idleBus: any[] = [];
  idleBusCount = 0;
  idleBusData: any[] = [];
  finishedBus = 0;
  finishedBusData: any[] = [];
  stillBus = 0;
  stillBusData: any[] = [];

  //Earning
  todayEarning = 0;
  yesterdayEarning = 0;

  paginatedBuses: any[] = []; // Data to display on current page

  // Pagination variables
  currentPage: number = 1;
  itemsPerPage: number = 10; // Show 10 items per page
  totalItems: number = 0;
  totalPages: number = 0;
  Math = Math; // To use Math.min in template

  barChart?: Chart;
  pieChart?: Chart;

  public user: any;
  public tokenData: any;

  public userId: any;

  public endpoint: any;

  public isLodaing: boolean = true;
  public userInputData: any = {
    tripId: '',
    station: '',
    std: '',
    etd: '',
    gate: '',
    status: '',
    next_stop: '',
    stations: [],
    schedule_time: '',
  };
  tripList: any[] = [];

  dashboardSub!: Subscription;

  constructor(
    private spinner: NgxSpinnerService,
    private homeService: HomeService,
    private loginService: LoginService,
    private toastr: ToastrService,
  ) {
    this.endpoint = environment.BASE_URL;
    this.init();
  }

  init = () => {
    let token = JSON.parse(JSON.stringify(localStorage.getItem('token')));
    token = JSON.parse(token);

    this.tokenData = token;
    console.log('Token=', token);
    this.user = token['usr'];
    this.isLodaing = false;
    if (!token.usr.accessKeyword) {
      console.log('gggggggggggggggggggggg');
      return;
    }
  };

  ngOnInit(): void {
    this.getDashboardData(); // first call
  this.dashboardSub = interval(30000).subscribe(() => {
    this.getDashboardData();
  });
  }

  ngOnDestroy() {
  this.dashboardSub?.unsubscribe();
}

  // private getCurrentTime(): string {
  //   const now = new Date();
  //   const hours = now.getHours().toString().padStart(2, '0'); // Pad with leading zero
  //   const minutes = now.getMinutes().toString().padStart(2, '0'); // Pad with leading zero
  //   return `${hours}:${minutes}`;
  // }

  spiner() {
    this.spinner.show();
    setTimeout(() => {
      this.spinner.hide();
    }, 5000);
  }

  getCache = async () => {
    const newCache = await caches.open('new-cache');
    const response = await newCache.match('yes');
  };

  getDashboardData() {
    this.homeService.getDashboardCounts((err: any, res: any) => {
      if (err) {
        console.error(err);
        return;
      }
      console.log('Dashboard Data:', res);

      // Assign API values
      this.totalBus = res.totalBus;
      this.totalDriver = res.totalDriver;
      this.totalConductor = res.totalConductor;
      this.totalRoute = res.totalRoute;

      this.runningBus = res.runningBus;
      this.runningVehicle = res.runningVehicle;
      this.idleBusCount = res.idleBusData.length;
      this.idleBusData = res.idleBusData;
      this.finishedBusData = res.finishedBusData;
      this.finishedBus = res.finishedBus;
      this.stillBus = res.stillBus;
      this.stillBusData = res.stillBusData;

      this.todayEarning = res.todayEarning?.toLocaleString('en-IN');
      this.yesterdayEarning = res.yesterdayEarning?.toLocaleString('en-IN');

      console.log('idle', this.idleBus);

      // **ADDED THIS LINE - Initialize pagination after data is loaded**
      this.updatePagination();

      // this.totalBus = res.totalBus;
      // this.totalDriver = res.totalDriver;
      // this.totalConductor = res.totalConductor;
      // this.totalRoute = res.totalRoute;

      // Load chart AFTER data arrives
      setTimeout(() => {
        this.loadBarChart();
        this.loadPieChart();
      }, 0);
    });
  }

  loadBarChart() {
  // ✅ If chart already exists → update data only
  if (this.barChart) {
    this.barChart.data.datasets[0].data = [
      this.totalBus,
      this.totalDriver,
      this.totalConductor,
      this.totalRoute,
    ];
    this.barChart.update();
    return;
  }

  // ✅ Create chart first time only
  this.barChart = new Chart('transportBarChart', {
    type: 'bar',
    data: {
      labels: ['Buses', 'Drivers', 'Conductors', 'Routes'],
      datasets: [
        {
          label: 'Count',
          data: [
            this.totalBus,
            this.totalDriver,
            this.totalConductor,
            this.totalRoute,
          ],
          backgroundColor: ['#4e73df', '#1cc88a', '#f6c23e', '#e74a3b'],
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom' },
      },
    },
  });
}


  loadPieChart() {

  // ✅ If already created → just update data
  if (this.pieChart) {
    this.pieChart.data.datasets[0].data = [
      this.runningBus,
      this.idleBusCount,
      this.finishedBus,
      this.stillBus,
    ];
    this.pieChart.update();
    return;
  }

  // ✅ Create chart first time only
  this.pieChart = new Chart('transportPieChart', {
    type: 'pie',
    data: {
      labels: [
        'Running Today',
        'Idle Today',
        'Finished Today',
        'Breakdown',
      ],
      datasets: [
        {
          data: [
            this.runningBus,
            this.idleBusCount,
            this.finishedBus,
            this.stillBus,
          ],
          backgroundColor: ['#1cc88a', '#f6c23e', '#17a2b8', '#6c757d'],
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom' },
      },
    },
  });
}


  // Update pagination when data changes
  updatePagination() {
    this.totalItems = this.idleBus.length;
    this.totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
    this.updatePaginatedData();
  }

  // Update the data shown on current page
  updatePaginatedData() {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.paginatedBuses = this.idleBus.slice(startIndex, endIndex);
  }

  // Navigate to specific page
  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePaginatedData();
    }
  }

  // Generate page numbers for pagination
  getPageNumbers(): number[] {
    const pages: number[] = [];
    const maxPagesToShow = 5;

    if (this.totalPages <= maxPagesToShow) {
      // Show all pages if total is less than max
      for (let i = 1; i <= this.totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Show subset of pages with current page in middle
      let startPage = Math.max(1, this.currentPage - 2);
      let endPage = Math.min(this.totalPages, this.currentPage + 2);

      if (this.currentPage <= 3) {
        endPage = maxPagesToShow;
      }
      if (this.currentPage >= this.totalPages - 2) {
        startPage = this.totalPages - maxPagesToShow + 1;
      }

      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }
    }

    return pages;
  }

  // Download report for Running Buses Modal (EXCEL)
  downloadRunningBusReport() {
    // Prepare data as array of objects
    const data = this.runningVehicle.map((bus, index) => ({
      'Sl No.': index + 1,
      'Vehicle Number': bus?.bus?.busNo || 'N/A',
      'Route Number': bus.routeNo || 'N/A',
      'Driver ID': bus?.driver?.driver_id || 'N/A',
      'Conductor ID': bus?.conductor?.conductor_id || 'N/A',
    }));

    // Create worksheet
    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(data);

    // Create workbook
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Running Buses');

    // Save file
    XLSX.writeFile(wb, `running-buses-${new Date().getTime()}.xlsx`);
  }

  // Download report for Idle Buses Modal (EXCEL)
  downloadIdleBusReport() {
    const data = this.idleBusData.map((bus, index) => ({
      'Sl No.': index + 1,
      'Vehicle Number': bus?.bus?.busNo || 'N/A',
      'Idle Reason': bus.idleReason || 'Not Specified',
    }));

    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(data);
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Idle Buses');

    XLSX.writeFile(wb, `idle-buses-${new Date().getTime()}.xlsx`);
  }

  // NOW YOU TRY! Download report for Finished Buses Modal (EXCEL)
  downloadFinishedBusReport() {
    const data = this.finishedBusData.map((bus, index) => ({
      'Sl No.': index + 1,
      'Vehicle Number': bus?.bus?.busNo || 'N/A',
      'Route Number': bus?.route?.routeNo || 'N/A',
      'Driver ID': bus?.driver?.driver_id || 'N/A',
      'Conductor ID': bus?.conductor?.conductor_id || 'N/A',
      Earnings: bus?.netAmountDeposited || '0',
    }));


    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(data);
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Finished Buses');

    XLSX.writeFile(wb, `finished-buses-${new Date().getTime()}.xlsx`);
  }

  // Download report for Breakdown Buses Modal (EXCEL)
  downloadBreakdownBusReport() {
    const data = this.stillBusData.map((bus, index) => ({
      'Sl No.': index + 1,
      'Vehicle Number': bus?.bus?.busNo || 'N/A',
      'Route Number': bus?.routeNo || 'N/A',
      'Driver ID': bus?.driver?.driver_id || 'N/A',
      'Conductor ID': bus?.conductor?.conductor_id || 'N/A',
      'Trip Completed': bus.noOfTrip || 'N/A',
      'Kilometres Driven': bus.totalOperated || 'N/A',
      'Place of Breakdown': bus.placeOfBreakdown || 'N/A',
      'Time of Breakdown': bus.stopTime || 'N/A',
    }));


    // console.log("data", data);
    // console.log("stillBusData", this.stillBusData);

    // return;

    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(data);
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Breakdown Buses');

    XLSX.writeFile(wb, `breakdown-buses-${new Date().getTime()}.xlsx`);
  }
}
