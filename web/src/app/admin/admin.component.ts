import { Component, OnInit } from '@angular/core';
import { ApiService } from '../api.service';
import { UserService } from '../user.service';

@Component({
  selector: 'app-admin',
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.css']
})
export class AdminComponent implements OnInit {
  constructor(public userService: UserService, private api: ApiService) {}

  async ngOnInit() {
    const arr = await this.api.get(null, '/assets/kelurahan_ids.js');
    console.log(arr);
  }
}
