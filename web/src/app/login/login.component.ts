import { Component, OnInit, Input } from '@angular/core';
import { UserService } from '../user.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styles: ['']
})
export class LoginComponent implements OnInit {
  @Input() fitur: string;

  constructor(public userService: UserService) {}

  ngOnInit() {}
}
