import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { AppService } from 'src/app/app.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-operators',
  templateUrl: './operators.component.html',
  styleUrls: ['./operators.component.css']
})
export class OperatorsComponent {

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
    operator_id: '',
    operator_name: '',
    contact_no: '',
    aadhaar: '',
    pan: '',
    voter: '',
    address: '',
    license_no: '',
    photo: null
  };

  operatorList: any;

  ngOnInit(): void {
    this.getOperators();
  }

  isEdit: boolean = false;

  openNewOperatorDialog = () => {
    this.isEdit = false;

    this.form1 = {
      operator_id: '',
      operator_name: '',
      contact_no: '',
      aadhaar: '',
      pan: '',
      voter: '',
      address: '',
      license_no: '',
      photo: null
    };

    this.imagePreview = null;
  };


  onPhotoChange(event: any) {

    const file = event.target.files[0];

    if (!file) return;

    if (!file.type.startsWith('image/')) {
      this.toastr.warning('Only image files allowed');
      return;
    }

    this.form1.photo = file;

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

    formData.append('operator_id', this.form1.operator_id);
    formData.append('operator_name', this.form1.operator_name);
    formData.append('contact_no', this.form1.contact_no);
    formData.append('aadhaar', this.form1.aadhaar);
    formData.append('pan', this.form1.pan);
    formData.append('voter', this.form1.voter);
    formData.append('address', this.form1.address);
    formData.append('license_no', this.form1.license_no);
    formData.append('photo', this.form1.photo);

    const ENDPOINT = `${environment.BASE_URL}/api/saveOperator`;

    this.http.post(ENDPOINT, formData).subscribe(
      (response) => {

        this.getOperators();
        this.resetForm1();

        this.toastr.success('Added Successfully', 'Success');
        this.imagePreview = null;

      },
      (error) => {

        console.log(error);
        this.toastr.error('Something went wrong !', 'Error');
      }
    );
  };



  openEditOperatorDialog = (data: any) => {

    this.isEdit = true;

    this.form1 = {

      id: data?.id,
      operator_id: data?.operator_id,
      operator_name: data?.operator_name,
      contact_no: data?.contact_no,
      aadhaar: data?.aadhaar,
      pan: data?.pan,
      voter: data?.voter,
      address: data?.address,
      license_no: data?.license_no,
      photo: null,
      old_photo: data?.photo
    };

    if (data?.photo) {
      this.imagePreview = `${environment.BASE_URL}/docs/${data.photo}`;
    }

  };



  updateData = () => {

    if (!this.form1.id) {
      this.toastr.warning('Something went wrong!', 'Warning');
      return;
    }

    const formData = new FormData();

    formData.append('id', this.form1.id);
    formData.append('operator_id', this.form1.operator_id);
    formData.append('operator_name', this.form1.operator_name);
    formData.append('contact_no', this.form1.contact_no);
    formData.append('aadhaar', this.form1.aadhaar || '');
    formData.append('pan', this.form1.pan || '');
    formData.append('voter', this.form1.voter || '');
    formData.append('address', this.form1.address || '');

    formData.append('old_photo', this.form1.old_photo || '');
    formData.append('license_no', this.form1.license_no || '');
    if (this.form1.photo) {
      formData.append('photo', this.form1.photo);
    }

    const ENDPOINT = `${environment.BASE_URL}/api/updateOperator`;

    this.http.post(ENDPOINT, formData).subscribe(

      () => {

        this.getOperators();
        this.resetForm1();
        this.imagePreview = null;

        this.toastr.success(
          'Operator record updated successfully',
          'Success'
        );

      },

      () => {
        this.toastr.error('Something went wrong!', 'Error');
      }

    );

  };



  getOperators = () => {

    const ENDPOINT = `${environment.BASE_URL}/api/getOperator`;

    this.http.get(ENDPOINT).subscribe(

      (response) => {

        console.log(response);
        this.operatorList = response;

      },

      (error) => {

        console.log(error);
        this.toastr.error('Something went wrong !', 'Warning');

      }

    );

  };



  resetForm1() {

    this.form1 = {};
    this.isEdit = false;

  }



  closeForm() {

    this.imagePreview = null;

  }



  toBeDeletedOperatorRecord: any = {};

  openConfirmationDialog = (data: any) => {

    this.toBeDeletedOperatorRecord = data;

  }



  handleDeleteOperator = () => {

    if (this.toBeDeletedOperatorRecord.id != '') {

      const ENDPOINT = `${environment.BASE_URL}/api/deleteOperator`;

      const requestOptions = {
        requestObject: this.toBeDeletedOperatorRecord,
      };

      this.http.post(ENDPOINT, requestOptions).subscribe(

        () => {

          this.getOperators();

          this.toastr.success(
            "Operator deleted successfully",
            "Success"
          );

        },

        (error) => {

          console.log(error);
          this.toastr.error("Something went wrong !", "Warning");

        }

      );

    }

  };



  selectedData: any;

  viewOperatorData = (id: any) => {

    this.selectedData = this.operatorList[id];

  };

}