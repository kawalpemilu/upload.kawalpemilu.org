import { Component, OnInit } from '@angular/core';
import { UserService } from '../user.service';

@Component({
  selector: 'app-foto',
  templateUrl: './foto.component.html',
  styles: ['']
})
export class FotoComponent implements OnInit {
  constructor(public userService: UserService) {}

  ngOnInit() {}
}
