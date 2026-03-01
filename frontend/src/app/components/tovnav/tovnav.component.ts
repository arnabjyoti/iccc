import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AppService } from '../../app.service';
import { LoginService } from 'src/app/login/login.service';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-tovnav',
  templateUrl: './tovnav.component.html',
  styleUrls: ['./tovnav.component.css'],
  providers: [DatePipe],
})
export class TovnavComponent implements OnInit {
  public user: any;
  public shortName: any;
  public userId: any;
  public tokenData: any;
  public menuItems: any;
  public myDate: any = new Date();
  
  // Search functionality properties
  public searchQuery: string = '';
  public showSuggestions: boolean = false;
  public searchSuggestions: any[] = [];
  public allSearchableItems: any[] = [];

  constructor(
    private loginService: LoginService, 
    private datePipe: DatePipe,
    private router: Router
  ) {
    this.myDate = this.datePipe.transform(this.myDate, 'EEEE, dd-MM-yyyy');
  }

  ngOnInit(): void {
    this.getUserDetails();
    console.log('user ', this.user);
    this.initializeSearchData();
  }

  getUserDetails = () => {
    let token = JSON.parse(JSON.stringify(localStorage.getItem('token')));
    token = JSON.parse(token);

    this.tokenData = token;

    if (token) {
      this.user = token['usr'];
      this.sideMenu(token['usr']);
      this.userId = this.user.id;
      console.log('usr name=', this.user.f_name);
      this.shortName = this.user.f_name.substring(0, 3);
    } else {
      console.log('Token not');
    }
  };

  // Initialize searchable data based on menu items and other entities
  initializeSearchData = () => {
    // Add menu items to searchable data
    if (this.menuItems) {
      this.allSearchableItems = this.menuItems.map((item: any) => ({
        type: 'menu',
        label: item.label,
        icon: item.icon,
        routerLink: item.routerLink,
        keywords: item.label.toLowerCase()
      }));
    }

    // You can add more searchable items here
    // For example: buses, routes, staff, etc.
    const additionalItems = [
      { type: 'action', label: 'Logout', icon: 'fas fa-power-off', action: 'logout', keywords: 'logout sign out exit' },
      { type: 'action', label: 'Profile', icon: 'fas fa-user-circle', routerLink: '/profile', keywords: 'profile account user settings' },
      { type: 'quick-link', label: 'Dashboard', icon: 'fas fa-tachometer-alt', routerLink: '/home', keywords: 'dashboard home overview' }
    ];

    this.allSearchableItems = [...this.allSearchableItems, ...additionalItems];
  };

  // Handle search input changes
  onSearchInput = (event: any) => {
    const query = event.target.value;
    this.searchQuery = query;

    if (query.trim().length > 0) {
      this.filterSuggestions(query);
      this.showSuggestions = true;
    } else {
      this.showSuggestions = false;
      this.searchSuggestions = [];
    }
  };

  // Filter suggestions based on search query
  filterSuggestions = (query: string) => {
    const searchTerm = query.toLowerCase().trim();
    
    this.searchSuggestions = this.allSearchableItems.filter(item => 
      item.keywords.includes(searchTerm) || 
      item.label.toLowerCase().includes(searchTerm)
    ).slice(0, 8); // Limit to 8 suggestions
  };

  // Handle suggestion click
  onSuggestionClick = (suggestion: any) => {
    if (suggestion.routerLink) {
      this.router.navigate([suggestion.routerLink]);
    } else if (suggestion.action === 'logout') {
      this.signout();
    }
    this.clearSearch();
  };

  // Clear search
  clearSearch = () => {
    this.searchQuery = '';
    this.showSuggestions = false;
    this.searchSuggestions = [];
  };

  // Handle click outside to close suggestions
  onSearchBlur = () => {
    // Delay to allow click on suggestion to register
    setTimeout(() => {
      this.showSuggestions = false;
    }, 200);
  };

  // Handle focus to show suggestions if query exists
  onSearchFocus = () => {
    if (this.searchQuery.trim().length > 0) {
      this.filterSuggestions(this.searchQuery);
      this.showSuggestions = true;
    }
  };

  signout = () => {
    localStorage.removeItem('token');
    const token = localStorage.getItem('token');
    if (!token) {
      window.location.href = '/login';
      location.reload();
    }
  };

  sideMenu = (user: any) => {
    console.log('role : ', user.role);

    // for operator 
    if (user.role === 'operator') {
      this.menuItems = [
        {
          label: 'Home',
          icon: 'fas fa-home',
          routerLink: '/home',
        },
        {
          label: 'Vehicle Master',
          icon: 'fas fa-bus',
          routerLink: '/buses',
        },
        {
          label: 'Vehicle Routes',
          icon: 'fas fa-route',
          routerLink: '/bus-routes',
        },
        {
          label: 'Attendance',
          icon: 'fas fa-user-clock',
          routerLink: '/attendance',
        },
        // {
        //   label: 'Bus Staff',
        //   icon: 'fas fa-user-clock',
        //   routerLink: '/driver-conductor',
        // },



        {
    label: 'Staff Management',
    icon: 'fas fa-user',
    children: [
      {
        label: 'Drivers',
        routerLink: '/driver',
        icon: 'far fa-circle'
      },
      {
        label: 'Conductors',
        routerLink: '/conductor',
        icon: 'far fa-circle'
      },
    ]
  },
        // {
        //   label: 'Trips',
        //   icon: 'fas fa-suitcase',
        //   routerLink: '/trips',
        // },
        // {
        //   label: 'Arrival',
        //   icon: 'fas fa-plane-arrival',
        //   routerLink: '/arrival',
        // },
        // {
        //   label: 'Departure',
        //   icon: 'fas fa-plane-departure',
        //   routerLink: '/departure',
        // },
        // {
        //   label: 'Bus Info',
        //   icon: 'fas fa-bus',
        //   routerLink: '/businfo',
        // },
        // {
        //   label: 'Report',
        //   icon: 'fas fa-book',
        //   routerLink: '/report',
        // },
        {
          label: 'Earnings Book',
          icon: 'fas fa-book',
          routerLink: '/bus-daily-updates',
        },
        {
          label: 'Breakdown Vehicles',
          icon: 'fas fa-tools',
          routerLink: '/breakdown-vehicles',
        }
      ];
    }

    // for admin 
    if (user.role === 'cashier') {
      this.menuItems = [
        {
          label: 'Home',
          icon: 'fas fa-home',
          routerLink: '/home',
        },
        {
          label: 'bus-daily-updates',
          icon: 'fas fa-bus',
          routerLink: '/bus-daily-updates',
        },
        {
          label: 'Trips',
          icon: 'fas fa-suitcase',
          routerLink: '/trips',
        },
        {
          label: 'Arrival',
          icon: 'fas fa-plane-arrival',
          routerLink: '/arrival',
        },
        {
          label: 'Departure',
          icon: 'fas fa-plane-departure',
          routerLink: '/departure',
        },
        {
          label: '56 Ev buses',
          icon: 'fas fa-bus',
          routerLink: '/businfo',
        },
        {
          label: 'Report',
          icon: 'fas fa-book',
          routerLink: '/report',
        },
        {
          label: 'Trip Daily data',
          icon: 'fas fa-book',
          routerLink: '/trip-logs',
        },
      ];
    }

    // Reinitialize search data after menu items are set
    this.initializeSearchData();
  };


toggleMenu(item: any) {
  this.menuItems.forEach((i: any) => {
    if (i !== item) {
      i.open = false;
    }
  });

  item.open = !item.open;
}

}
