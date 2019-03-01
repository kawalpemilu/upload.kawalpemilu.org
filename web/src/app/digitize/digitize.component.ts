import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { HierarchyNode, MAX_RELAWAN_TRUSTED_DEPTH } from 'shared';
import { HierarchyService } from '../hierarchy.service';
import { UploadService } from '../upload.service';
import { UserService } from '../user.service';
import { ActivatedRoute } from '@angular/router';
import { map, filter, distinctUntilChanged, switchMap } from 'rxjs/operators';

@Component({
  selector: 'app-digitize',
  templateUrl: './digitize.component.html',
  styleUrls: ['./digitize.component.css']
})
export class DigitizeComponent implements OnInit {
  state$: Observable<HierarchyNode>;

  constructor(
    public hie: HierarchyService,
    public uploadService: UploadService,
    public userService: UserService,
    private route: ActivatedRoute
  ) {}

  get MAX_TRUSTED_DEPTH() {
    return MAX_RELAWAN_TRUSTED_DEPTH;
  }

  ngOnInit() {
    this.state$ = this.route.paramMap.pipe(
      map(params => params.get('id')),
      filter(Boolean),
      map(id => parseInt(id, 10)),
      distinctUntilChanged(),
      switchMap(id => this.hie.get$(id))
    );

    console.log('DigitizeComponent inited');
  }
}
