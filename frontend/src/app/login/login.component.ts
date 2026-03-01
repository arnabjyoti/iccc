import { Component, OnInit } from '@angular/core';
import { LoginService } from './login.service';
import { ToastrService } from "ngx-toastr";
import { Router } from '@angular/router';
import {Location} from '@angular/common';


@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit{
  returnMsg:any;
  createMsg:any;
  showVerify: boolean =false;
  public isLogin: boolean = false;
  public isRegister: boolean = false;
  showOTPInput: boolean = false;

  public inputData = {
    f_name: "",
    m_name: "",
    l_name: "",
    email:"",
    phone_no:"",
    password: "",
    otp: ""
  }
  public OTP = {
    otp1: "",
    otp11: "",
    otp22: "",
    otp33: "",
    otp44: "",
    otp55: "",
    otp66: "",
  }
  mat0: any;

  constructor(
    private LoginService: LoginService,
    private toastr: ToastrService,
    private router: Router,
    private location: Location
    // private router: Router,
  ) {}
  ngOnInit(): void {
    
    this.checkToken();
    
  }

  focusNext(nextInput: HTMLInputElement) {
    nextInput.focus();
  }

  checkToken(){
    let token = JSON.parse(JSON.stringify(localStorage.getItem('token')));
    token = JSON.parse(token);
    console.log("Tokennnn=", token);
    if(token){
      console.log("calll");
      this.router.navigate(['/home']);
      // this.location.back();
    }
    else{
      console.log("no token");
      
    }
  }

  validateEmail = ()=> {
    if (this.returnMsg === "notExist") {
      this.toastr.error("Email is not registered", "Warning");
      return false;
    }
  return true;
}

  sendOtp()  {
    let regExp_email = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
    if (!regExp_email.test(this.inputData.email)) {
      //alert('Enter valid email adress')
      this.toastr.error("Enter valid email address", "Warning");
    } else {
      this.LoginService.verifyEmail(this.inputData.email, (res: any) => {
        this.returnMsg = res.message;
        console.log("lllllllllll",this.returnMsg);
      
      this.validateEmail();
      if (this.validateEmail()) {
        // this.mat0 = Math.floor(Math.random()*(999-100+1)+100);
        this.mat0 =Math.floor(100000 + Math.random() * 900000);
        console.log("ggg",this.mat0);
        this.inputData.otp = this.mat0;
        console.log("oooooooooooooooo",this.inputData);
        this.LoginService.sendOtp(this.inputData, (res: any) => {
          this.returnMsg = res.message;
          if (this.returnMsg == "success") {
            this.toastr.success("OTP has been send");
          } else {
            this.toastr.error("OTP not send");
          }
          console.log("pppppppppppp",res);
        });
          if (this.mat0 !== "") {
            this.showOTPInput = true;
          } else {
            this.toastr.error(
              "Oops! Something went wrong. Please try again",
              "Warning"
            );
          }
        }
      });
    }
  }

  verifyOtpData() {
    let otp77 = this.OTP.otp11+""+this.OTP.otp22+""+this.OTP.otp33+""+this.OTP.otp44+""+this.OTP.otp55+""+this.OTP.otp66;
    console.log("otppppppppppppppppppp", otp77);
    
    let requestObject = {
      otp: parseInt(otp77),
    };
    console.log("verifyOtpData");
    
    if (requestObject.otp === this.mat0) {
      this.toastr.success('OTP verification Successful.','Success!',{
        disableTimeOut:false
      });
      this.showVerify = true;
      this.LoginService.loginVerify(this.inputData, (res: any) => {
        this.isLogin = false;
        console.log("cccccccccccccccccccc",res);
        
        if (res.status == true) {
          console.log("call");
          let data = res.message; 
          console.log("ddddddddddddddddd",res);
          
          const userid = data.usr.email;
          localStorage.setItem("token", JSON.stringify(data));
          // this.setCache();
          //  this.router.navigate(['/home']);
          console.log("home");
          
          window.location.href = "/home";
          // window.location.reload();
        }
      });
    } else {
      this.toastr.error('OTP not matched.','Warning',{
        disableTimeOut:false
      });
    }
    console.log("jjjj",requestObject.otp);
    console.log("kkkkkkkk",this.mat0);
    
  }
  

  setCache = async () => {
    const newCache = await caches.open("new-cache");
    let obj = {
      id: 1,
      name: "ADRP"  
    };
    newCache.add("yes");
  };

  
}
