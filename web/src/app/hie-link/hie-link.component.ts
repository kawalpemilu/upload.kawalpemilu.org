import { Component, OnInit, Input } from '@angular/core';
import { Router } from '@angular/router';
import { HierarchyService } from '../hierarchy.service';
import { take } from 'rxjs/operators';

@Component({
  selector: 'app-hie-link',
  template: `
    <a style="cursor: pointer" [style.color]="color" (click)="navigate()">{{
      name | uppercase
    }}</a>
  `,
  styles: [``]
})
export class HieLinkComponent implements OnInit {
  @Input() id: number;
  @Input() name: String;

  color = 'blue';

  constructor(private router: Router, private hie: HierarchyService) {}

  ngOnInit() {}

  async navigate() {
    this.color = 'purple';
    const h = await this.hie
      .get$(this.id)
      .pipe(take(1))
      .toPromise();
    this.router.navigate([h.depth < 4 ? '/h' : '/t', this.id]);
  }
}
