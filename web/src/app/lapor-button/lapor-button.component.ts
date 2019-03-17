import { Component, OnInit, Input } from '@angular/core';
import { UserService } from '../user.service';
import { ApiService } from '../api.service';
import { HierarchyService } from '../hierarchy.service';

@Component({
  selector: 'app-lapor-button',
  template: `
    <button
      *ngIf="(userService.relawan$ | async) as relawan"
      mat-raised-button
      color="warn"
      (click)="laporKesalahan(relawan.auth)"
      [disabled]="isLoading"
    >
      Lapor <mat-icon>error_outline</mat-icon>
    </button>
  `,
  styles: ['']
})
export class LaporButtonComponent implements OnInit {
  @Input() id: number;
  @Input() imageId: string;

  isLoading = false;

  constructor(
    public userService: UserService,
    private api: ApiService,
    private hie: HierarchyService
  ) {}

  ngOnInit() {}

  async laporKesalahan(user) {
    this.isLoading = true;
    await this.api.post(user, `problem`, { imageId: this.imageId });
    await new Promise(resolve => setTimeout(resolve, 1000));
    await this.hie.update(user, this.id);
    this.isLoading = false;
  }
}
