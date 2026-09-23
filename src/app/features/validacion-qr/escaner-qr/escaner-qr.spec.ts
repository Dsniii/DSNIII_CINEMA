import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EscanerQr } from './escaner-qr';

describe('EscanerQr', () => {
  let component: EscanerQr;
  let fixture: ComponentFixture<EscanerQr>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EscanerQr],
    }).compileComponents();

    fixture = TestBed.createComponent(EscanerQr);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
