import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-faq',
  template: `
    <h3>Tentang #PantauFotoUpload</h3>
    <ul>
      <li>
        <b>Apakah saya hanya boleh mengawal TPS dimana saya nyoblos?</b><br />
        Nggak juga. Misalnya di rumah ada 5 orang yang nyoblos di TPS yang sama,
        bisa disebar untuk ambil foto dan upload di 5 TPS yang berbeda. Tapi
        setidaknya bisa #PantauFotoUpload di TPS domisili.<br /><br />
      </li>
      <li>
        <b>Bolehkah saya hanya upload foto C1 Pilpres?</b><br />
        Boleh. Mau Pilpres (istilahnya di formulir: PPWP) saja boleh, mau
        Pilpres DPR DPRD sampai DPD pun boleh.<br /><br />
      </li>
      <li>
        <b
          >Bolehkah saya posting foto C1-nya di Facebook / WA / Twitter saya
          saja?</b
        ><br />
        Silakan kalau mau posting di medsos masing-masing dengan hestek
        #PantauFotoUpload. Tapi kalau kamu upload fotonya ke situs
        upload.kawalpemilu.org, kamu sudah mengawal TPS kamu satu langkah lebih
        maju karena angka di foto itu dihitung sampai tingkat nasional sebagai
        pembanding data KPU.<br /><br />
      </li>
      <li>
        <b>Bolehkah saya posting foto C1 PLANO yang belum ditandatangan?</b
        ><br />
        Kalau kamu yakin penghitungan sudah selesai, silakan kalau mau foto dan
        upload walaupun belum ditandatangan. Tapi pastikan nomor TPS dan
        kelurahan/kecamatan/kabupatennya sudah ditulis dan angka-angkanya sudah
        dijumlahkan.<br /><br />
      </li>
      <li>
        <b>Bolehkah saya upload foto yang diambil oleh orang lain?</b><br />
        Silakan, terutama kalau teman kamu tidak punya Facebook login. Bisa
        kumpulkan fotonya di kamu lalu kamu upload satu persatu.<br /><br />
      </li>
      <li>
        <b>Kok perlu fotonya banyak banget?</b><br />
        Karena Pemilu kita kali ini serentak. Karenanya ada 2 lembar C1 PLANO
        untuk Pilpres (atau PPWP) dan 18 lembar untuk DPR RI.<br /><br />
      </li>
      <li>
        <b>Bolehkah saya upload foto catatan hitungan saya sendiri?</b><br />
        Catatan sendiri sulit dibuktikan keasliannya. Karenanya kami mengajak
        warga untuk mengambil foto formulir C1, terutama plano, yang sulit
        dipalsukan.
      </li>
    </ul>

    <h3>
      Tentang kesulitan yang mungkin dihadapi
    </h3>

    <ul>
      <li>
        <b
          >Kalau saya kesulitan upload ke situs di hari H, kemana saya mesti
          melapor?</b
        ><br />
        Bisa kirim fotonya via e-mail ke kawalpemilu2019@gmail.com Kirim direct
        message di Facebook fanpage kami
        <a href="https://m.me/kawalpemilu.org" target="_blank"
          >m.me/kawalpemilu.org</a
        >
        atau Twitter
        <a href="https://t.co/NiyEQBA509" target="_blank">@KawalPemilu2019</a>
        Posting fotonya di timeline Facebook atau Twitter kamu dengan hestek
        #PantauFotoUpload. Pastikan privacy setting di medsos kamu "public".<br /><br />
      </li>
      <li>
        <b
          >Kalau saya kehabisan waktu untuk mengambil foto C1 PLANO
          bagaimana?</b
        ><br />
        Keesokan harinya, kamu bisa mengambil fotonya di Kantor Lurah / Desa.
        Salinan C1 dari semua TPS yang ada di kelurahan tersebut harus sudah
        ditempelkan untuk dilihat warga.<br /><br />
      </li>
      <li>
        <b>Penghitungan suaranya lama sekali, saya ngantuk ...</b><br />
        Memang diperkirakan berlangsung sampai malam. Kalau tidak bisa menunggu,
        bisa datang ke Kantor Lurah / Desa keesokan harinya untuk mengambil foto
        salinan formulir C1.
      </li>
    </ul>

    <h3>
      Tentang Facebook
    </h3>

    <ul>
      <li>
        <b>Wah, saya lupa password FB! Gimana dong?</b><br />
        Anda perlu reset password<br /><br />
      </li>
      <li>
        <b>Bagaimana kalau saya nggak punya akun FB?</b><br />
        Anda bisa upload fotonya ke sosmed (buat setting nya “public”) dengan
        hestek #PantauFotoUpload lalu tag Twitter @kawalpemilu2019 atau Facebook
        @kawalpemilu.org
      </li>
    </ul>
  `,
  styles: [``]
})
export class FaqComponent implements OnInit {
  constructor() {}

  ngOnInit() {}
}
