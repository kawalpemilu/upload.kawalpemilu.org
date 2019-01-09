import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { TpsComponent } from './tps.component';

describe('TpsComponent', () => {
  let component: TpsComponent;
  let fixture: ComponentFixture<TpsComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ TpsComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TpsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
