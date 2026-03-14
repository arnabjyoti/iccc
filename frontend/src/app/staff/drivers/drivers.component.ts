import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { AppService } from 'src/app/app.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-drivers',
  templateUrl: './drivers.component.html',
  styleUrls: ['./drivers.component.css']
})
export class DriversComponent {

  public endpoint: string;
  constructor(
    private appService: AppService,
    private http: HttpClient,
    private toastr: ToastrService,
    private router: Router
  ) {
    this.endpoint = environment.BASE_URL;
  }

  imagePreview: string | ArrayBuffer | null = null;

  form1: any = {
    driver_id: '',
    driver_name: '',
    contact_no: '',
    aadhaar: '',
    pan: '',
    voter: '',
    dl: '',
    address: '',
    photo: null,
  };

  busDriverList: any;
  driverList: any;

  ngOnInit(): void {
    this.getDrivers();
  }


  isEdit: boolean = false;
  openNewDriverDialog = () => {
    this.isEdit = false;
    this.form1 = {
      driver_id: '',
      driver_name: '',
      contact_no: '',
      aadhaar: '',
      pan: '',
      voter: '',
      dl: '',
      address: '',
      photo: null,
    };
  };

  onPhotoChange(event: any) {
    const file = event.target.files[0];

    if (!file) return;

    // validate image
    if (!file.type.startsWith('image/')) {
      this.toastr.warning('Only image files allowed');
      return;
    }

    // 🔹 assign based on mode

    this.form1.photo = file;


    // preview
    const reader = new FileReader();
    reader.onload = () => {
      this.imagePreview = reader.result;
    };
    reader.readAsDataURL(file);
  }


  saveData = (form: any) => {
    if (form.invalid || !this.form1.photo) {
      this.toastr.warning(
        'Please fill-up all fields and upload photo',
        'Warning'
      );
      return;
    }

    const formData = new FormData();
    formData.append('driver_id', this.form1.driver_id);
    formData.append('driver_name', this.form1.driver_name);
    formData.append('contact_no', this.form1.contact_no);
    formData.append('aadhaar', this.form1.aadhaar);
    formData.append('pan', this.form1.pan);
    formData.append('voter', this.form1.voter);
    formData.append('dl', this.form1.dl);
    formData.append('address', this.form1.address);
    formData.append('photo', this.form1.photo); // ✅ IMPORTANT

    const ENDPOINT = `${environment.BASE_URL}/api/saveDriver`;

    // 🔥 SEND FORMDATA — NOT JSON
    this.http.post(ENDPOINT, formData).subscribe(
      (response) => {
        console.log('response ', response);
        this.getDrivers();
        this.resetForm1();
        this.toastr.success('Added Successfully', 'Success');
        this.imagePreview = null;
      },
      (error) => {
        console.log('error here ', error);
        this.toastr.error('Something went wrong !', 'Error');
        this.imagePreview = null;
      }
    );
  };

  closeForm() {
    this.imagePreview = null;
  }

  resetForm1() {
    this.form1 = {};
    this.isEdit = false;
  }

  openEditDriverDialog = (data: any) => {
    this.isEdit = true;

    this.form1 = {
      id: data?.id,
      driver_id: data?.driver_id,
      driver_name: data?.driver_name,
      contact_no: data?.contact_no,
      aadhaar: data?.aadhaar,
      pan: data?.pan,
      voter: data?.voter,
      dl: data?.dl,
      address: data?.address,
      photo: null,              // NEW FILE (optional)
      old_photo: data?.photo    // EXISTING IMAGE PATH
    };

    // show existing photo preview
    if (data?.photo) {
      this.imagePreview = `${environment.BASE_URL}/docs/${data.photo}`;
    }
  };


  updateData = () => {
    if (!this.form1.id) {
      this.toastr.warning('Something went wrong! Please try again', 'Warning');
      return;
    }

    if (!this.form1.driver_name || !this.form1.contact_no) {
      this.toastr.warning('Please fill-up the form before proceed', 'Warning');
      return;
    }

    const formData = new FormData();
    formData.append('id', this.form1.id);
    formData.append('driver_id', this.form1.driver_id);
    formData.append('driver_name', this.form1.driver_name);
    formData.append('contact_no', this.form1.contact_no);
    formData.append('aadhaar', this.form1.aadhaar || '');
    formData.append('pan', this.form1.pan || '');
    formData.append('voter', this.form1.voter || '');
    formData.append('dl', this.form1.dl || '');
    formData.append('address', this.form1.address || '');

    // send old photo path
    formData.append('old_photo', this.form1.old_photo || '');

    // send new photo ONLY if selected
    if (this.form1.photo) {
      formData.append('photo', this.form1.photo);
    }

    const ENDPOINT = `${environment.BASE_URL}/api/updateDriver`;

    this.http.post(ENDPOINT, formData).subscribe(
      () => {
        this.getDrivers();
        this.resetForm1();
        this.imagePreview = null;
        this.isEdit = false;
        this.toastr.success('Driver record updated successfully', 'Success');
      },
      () => {
        this.toastr.error('Something went wrong!', 'Error');
      }
    );
  };


  getDrivers = () => {
    const ENDPOINT = `${environment.BASE_URL}/api/getDriver`;
    this.http.get(ENDPOINT).subscribe(
      (response) => {
        console.log('response ', response);
        this.driverList = response;
      },
      (error) => {
        console.log('error here ', error);
        this.toastr.error('Something went wrong !', 'Warning');
      },
      () => {
        console.log('Observable is now completed.');
      }
    );
  };

  toBeDeletedDriverRecord: any = {};
  openConfirmationDialog = (data: any) => {
    this.toBeDeletedDriverRecord = data;
  }

  handleDeleteDriver = () => {
    if (this.toBeDeletedDriverRecord.id != '') {
      const ENDPOINT = `${environment.BASE_URL}/api/deleteDriver`;
      const requestOptions = {
        requestObject: this.toBeDeletedDriverRecord,
      };
      this.http.post(ENDPOINT, requestOptions).subscribe(
        (response) => {
          this.getDrivers();
          this.toastr.success("Driver deleted successfully", "Success Message");
        },
        (error) => {
          console.log("error here ", error);
          this.toastr.error("Something went wrong !", "Warning");

        },
        () => {
          console.log('Observable is now completed.');
        }
      );
    } else {
      this.toastr.warning("Please enter data properly before proceed", "Warning Message");
    }
  }

  selectedData: any;
  viewDriverData = (id: any) => {
    this.selectedData = this.driverList[id];
    console.log(this.driverList[id]);
  };

  activeTabName: any = 'Driver';
  setAddNewButton = (tabName: any) => {
    this.activeTabName = tabName;
  };
}
