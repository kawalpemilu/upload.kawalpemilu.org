import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { FotoComponent } from './foto.component';

describe('FotoComponent', () => {
  let component: FotoComponent;
  let fixture: ComponentFixture<FotoComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ FotoComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(FotoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
