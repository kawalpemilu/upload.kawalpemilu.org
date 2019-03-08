import {
  Component,
  OnInit,
  Input,
  HostListener,
  ViewChild,
  ElementRef
} from '@angular/core';
import { AngularFirestore } from '@angular/fire/firestore';
import { Upsert, FsPath } from 'shared';
import { Observable } from 'rxjs';
import { HierarchyService } from '../hierarchy.service';

@Component({
  selector: 'app-foto-detail',
  templateUrl: './foto-detail.component.html',
  styles: ['']
})
export class FotoDetailComponent implements OnInit {
  @Input() imageId: string;

  @ViewChild('tbl') el: ElementRef;

  upsert$: Observable<Upsert>;

  HEIGHT = 150;

  constructor(private fsdb: AngularFirestore, private hie: HierarchyService) {}

  ngOnInit() {
    this.checkVisibilityChange();
  }

  setUpsert() {
    this.upsert$ = this.fsdb
      .doc<Upsert>(FsPath.upserts(this.imageId))
      .valueChanges();
  }

  @HostListener('window:resize', ['$event'])
  onWindowResize() {
    this.checkVisibilityChange();
  }

  @HostListener('window:scroll', ['$event'])
  scrollHandler() {
    this.checkVisibilityChange();
  }

  checkVisibilityChange() {
    if (this.upsert$ || !this.el) {
      return;
    }
    const el = this.el.nativeElement;
    const r = el.getBoundingClientRect();
    const visible =
      r.top >= 0 &&
      r.left >= 0 &&
      r.bottom - this.HEIGHT <=
        (window.innerHeight || document.documentElement.clientHeight) &&
      r.right <= (window.innerWidth || document.documentElement.clientWidth);
    if (visible) {
      this.setUpsert();
    }
  }

  hie$(kelId) {
    return this.hie.get$(kelId, false);
  }

  status(u: Upsert) {
    if (u.data.sum.error) {
      return 'error';
    }
    if (u.data.sum.pending) {
      return 'pending';
    }
    if (u.deleted) {
      return 'deleted';
    }
  }

  color(u: Upsert) {
    if (u.data.sum.error) {
      return '#FDD';
    }
    if (u.data.sum.pending) {
      return '#FFD';
    }
    if (u.deleted) {
      return '#FAA';
    }
    return '';
  }
}
