import { Component, OnInit, Input } from '@angular/core';
import { UserService } from '../user.service';
import { ApiService } from '../api.service';
import { HierarchyService } from '../hierarchy.service';
import { ProblemRequest } from 'shared';

@Component({
  selector: 'app-lapor-button',
  template: `
    <table class="lapor" (click)="laporKesalahan()">
      <tr>
        <td>Lapor</td>
        <td><mat-icon>error_outline</mat-icon></td>
      </tr>
    </table>
  `,
  styles: [
    `
      .lapor {
        color: red;
        cursor: pointer;
      }
    `
  ]
})
export class LaporButtonComponent implements OnInit {
  @Input() kelId: number;
  @Input() tpsNo: number;
  @Input() url: string;

  isLoading = false;

  constructor(
    public userService: UserService,
    private api: ApiService,
    private hie: HierarchyService
  ) {}

  ngOnInit() {}

  async laporKesalahan() {
    const reason = prompt(`Silahkan tulis kesalahan di foto ini:`);
    if (!reason) {
      return false;
    }

    const req: ProblemRequest = {
      kelId: this.kelId,
      tpsNo: this.tpsNo,
      url: this.url,
      reason
    };

    this.isLoading = true;
    await this.api.post(this.userService.user, `problem`, req);
    await new Promise(resolve => setTimeout(resolve, 1000));
    await this.hie.update(this.kelId);
    this.isLoading = false;
  }
}
