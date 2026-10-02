// ข้อมูลระบบกองช่าง เทศบาลตำบลสีแก้ว
// ข้อมูลตั้งต้น (ตัวอย่าง) + ที่เก็บข้อมูลในเบราว์เซอร์ (localStorage) + ที่เก็บไฟล์ (IndexedDB)
(function () {
  'use strict';

  var IMG = {
      "coreDrill": "https://lh3.googleusercontent.com/aida-public/AB6AXuDdyG4YQ0FC0zebuUrMLAk3Tan69OKWDmr5VTJjkImAEFo2J-ogK9jccDOrjnThCGm_H-CnrjS4i5DAo9X87QTL1teL2lRBHKY2tDzri4CqmHw6Oalr03TX1zrxmrGGKIKrqMQHIojNHmHXffQqug5-KdGRy_hKP63WLO0nHqK388fB5OxqHyhJXTAV9cLiuNRnIbsR1_tcVAeKqOQTjPHGnzMjhsWJUdD_e9Sn67zK8HJ5J5gj9JMj",
      "excavator": "https://lh3.googleusercontent.com/aida-public/AB6AXuA3RLLCNiDJu_KvqYOGFa79pJZmHfD9yH7NaxnXZFkjUNk0oDOQLYlkzOKdj5QUY1TQqV_bCWziRh5fD02wHTgvQCM0Wb2KV_jbZHs-Dpdtqfeh7QRn4ny0T0ibqGiBY2OaUXzCGeBxxPhorCZy6ZjNGkdhwuax7jnXM7iWeOmh5Qs3l5tquQ00yTRAP-PswbmkVigPCSEJEES7qglmE64heTeWOwFlYPWmcpWisbXqX3Y7zDR6MtIQ",
      "solarDusk": "https://lh3.googleusercontent.com/aida-public/AB6AXuDuECWWu1D38rZkqkxc8OzsvrMqL9tRxbmRNDkZ41LOQMQW47KHreI8ugPkrqje1WaU12i3CJeFJLdjufzAhlUlT7Gnurvwei7z2B--xuIB7eYD6S-ejw_bvW1-l1yY3RvBH5CJL0LdHP_SK_ACT64faresc7cf8qt3Pjv579Oj68cOKhe_BaS5o87eoolpn0zIseY1_zAZYrcTbPonPof4iDq2pUrswO3YkZUHBXFY16X52Iz4XYkS",
      "slump": "https://lh3.googleusercontent.com/aida-public/AB6AXuDBE4lJk3AJZcvMeTIFiUppwSAncF-UfefAkZkPLbs43tbaGFoKUJKyZjtfryVGLXxOox5vfXlGKnsh-TNh56ysmiTgnQzbLq9m6rCOl2LLg2BjYV4bZzoqyvMBgP3sSbjoUMxyMwU9oKcu682k5uw2XDqkWGm8gsgrBq-gvBfEZK-QAWJez6QvIMJwpvNgIry_zBmHk_st2abbBn3llADI8wZd92aQ3WoDWKXeUBOyQ-0vtiTkXz6v",
      "curing": "https://lh3.googleusercontent.com/aida-public/AB6AXuDaZV9IHi1cM9bozTQefD7ML11GC5DWYu4G1yLM8buWaVzApszSu2G0Fm_0HaWUrO1mCy82ASwHwsk2pRnZLXesLmKeuGAtxf8G0onbSlX4APd4oqJ15Q7YhTVaHwR2wD5q8jFakVTvGnuVWoVAUKycxnIxmAu4iNBY34m7mrEjVPmeJvvqkBP9MPmsFS7hEku6F0x9cReW9z6OlhceMIdn6Ym8TYc4qJ9Ax-iw134Ya8kDg3K4jLgV",
      "joint": "https://lh3.googleusercontent.com/aida-public/AB6AXuD-fHuYRxTNcBXCU6L0RHOFbg5-5ITcB7kJR7Qd61fBxq2y1Grb-p30t88mWXnB6DpXaEfGzo0CaXwwCYXghG2wi938Dcl_LYUyHHxD6W22R66112VDmJVwra8a6jSeXKYhkk6d7WxfH3VsGUCwP-hv5m4h-BQSOCjW6NyedqgWah12rcuG5f99beaECEZIsS5xDb8qXUCFcB7Wb2cVQCEQ4ULWAYBMqSWLtv_ZdKhmZfqGrGyli52I",
      "roadPour": "https://lh3.googleusercontent.com/aida-public/AB6AXuD7DMbZeO2b8Fe6QY4I8hLMhKSgXB7_4otIjH8NUvQQ_6AN9qYWCldtUuLsQGh-Hf0HgQYr0B8SOrR-6pSP4BQv4fxPDgxv_Iv1WLNMiKb67CutkwxAe1AqVqz-QbrJJeayhbRLZDbZSz-5MwJfdBF0Nq5aDCkWqZr9YLZAP4n9vC9r4lY8kGkunGwsf-PgGF4k0x8I1NqhFG3JXfM45b-uwUE_GZlwKCTHcfJNn2MraVGkcxiiUpK8",
      "uDitch": "https://lh3.googleusercontent.com/aida-public/AB6AXuCosC6kYPyiK9Fv7Ya08GOKiv3YGsBFx3JLimmm8M59wj9xcppJPEhB3RsfgMaqdoWoR2egOqYz4D_jISrWe68ynpsVCmmEYmSAOWpr-IWjNroceU0S8VdWFDNKPSTbzKXFkTg8UkMs2-5YbanyEO_Wr4NRQKmHkmhKNm5nu93IiwPq1AA35ULYszoUNjLRnBD2Ft4anRxkxqDaTttzNMt5II9ezT0billCW4KWKGqZjMv3pJIiYjy6",
      "solarPole": "https://lh3.googleusercontent.com/aida-public/AB6AXuBWD-nV9wbUsAszuPXljlJMSvCkYYcJKENignf-Ar72LkhbCUOxO6Glw90M1ymLJf9l5fhkHH2MyOhQ7OayfP2eP5fcKRevSLnCwiwRijBMDN0qKmjoMsB7FIbogiUmGzOxchpSf7lsmuUauLS20MNxCkVb9clgOd764HIvGGeaROOJJr3rrcO_ijFMdx-JXOfI91tOkN1raglPgtQzvS4hvplwoXArIpnU2GUfJ__aZj-Xos15Qf_f",
      "survey": "https://lh3.googleusercontent.com/aida-public/AB6AXuA44iEv56cv_gIUpNqbmFsL_XX6cmWasKG4QrLiQaSlFi9CfftR3WzCWumw_mUx9WUiGg-7rw7loyTrO4cW5GsGTeBF2IIYz20drJXRcdkYgiDx5YWzSnr0qerfJMZtJaKExOOO1Ix0i_0P60CM17zJ7K91sWpPB0fQVuBTeXI4nXAamIB3tZkCbow3MJcHnmr1eQP-kNARUWn-cvWUuM7hTn1ttszrTsWWEU6k6TQnKGZ0MZVrTZTV",
      "map": "https://lh3.googleusercontent.com/aida-public/AB6AXuD8a4Pcb35vlzVOFDQOGHpoUrGevm8FkRcTjzfAsJTKHG-0pNhJ4FFjJphBpjX0lsYIUy0eFPZPVMUwNtb6NyB1DUtyaYfHQPDSYKf-l8A2hN9OgOyP8m0aiijCHxKpqHOfluVqAf1_8zvSTC8RErt9_Zcl5e6MB4D-9rf2ZvQmRfPa15VgqZJVNNXdompa6RRRbIqxObW8m5skENtVRycqdRJ1r7XEjLd50dShvI23FCZTCgMsFBG1"
  };

  var VILLAGES = {
    m1: { name: 'ม.1 บ้านสีแก้ว', lat: 16.0824, lng: 103.5932 },
    m2: { name: 'ม.2 บ้านดงเค็ง', lat: 16.0951, lng: 103.6058 },
    m3: { name: 'ม.3 บ้านหนองผือ', lat: 16.0703, lng: 103.5797 },
    m4: { name: 'ม.4 บ้านท่าม่วง', lat: 16.0617, lng: 103.6012 },
    m5: { name: 'ม.5 บ้านโคกหนองหญ้า', lat: 16.1012, lng: 103.5864 },
    m6: { name: 'ม.6 บ้านหนองบัว', lat: 16.0889, lng: 103.5701 },
    m7: { name: 'ม.7 บ้านโนนสวรรค์', lat: 16.0738, lng: 103.6155 },
    m8: { name: 'ม.8 บ้านสีแก้วใต้', lat: 16.0659, lng: 103.5903 },
    m9: { name: 'ม.9 บ้านพัฒนา', lat: 16.0927, lng: 103.5958 }
  };

  var CATEGORIES = {
    road: { label: 'งานทาง / ถนน / สะพาน', short: 'งานทาง', icon: 'road' },
    drainage: { label: 'งานระบบระบายน้ำ / แหล่งน้ำ', short: 'งานระบายน้ำ', icon: 'water_damage' },
    building: { label: 'งานอาคารสาธารณะ / สิ่งก่อสร้าง', short: 'งานอาคาร', icon: 'apartment' },
    electrical: { label: 'งานไฟฟ้าส่องสว่าง / โซลาร์เซลล์', short: 'งานไฟฟ้า', icon: 'solar_power' }
  };

  var STATUSES = {
    'on-schedule': { label: 'ปกติตามแผน', long: 'กำลังก่อสร้าง (ตามแผน)' },
    'delayed': { label: 'ล่าช้ากว่าแผน', long: 'มีความล่าช้า (มีหนังสือเร่งรัด)' },
    'pending-inspection': { label: 'รอตรวจรับพัสดุ', long: 'รอตรวจรับพัสดุ / คณะกรรมการตรวจรับ' },
    'completed': { label: 'เสร็จสิ้น / ส่งมอบ', long: 'ส่งมอบงานแล้วเสร็จ 100%' },
    'signing': { label: 'ระหว่างลงนามสัญญา', long: 'ระหว่างลงนามสัญญาจ้าง' },
    'unknown': { label: 'ไม่ระบุสถานะ', long: 'ยังไม่ระบุสถานะ / ยังไม่เริ่มงาน' }
  };

  var SOURCES = {
    'local': 'เงินรายได้เทศบาล',
    'general-grant': 'เงินอุดหนุนทั่วไป',
    'specific-grant': 'เงินอุดหนุนเฉพาะกิจ (สถ.)',
    'accumulated': 'เงินสะสมจ่ายขาด'
  };

  var STAFF = [
    'นายธีรภัทร ชาญวิทย์ (ผอ.กองช่าง)',
    'นายสมศักดิ์ สุขเจริญ (ช่างโยธาชำนาญงาน)',
    'นายสมชาย ยืนยง (นายช่างโยธาชำนาญงาน)',
    'นายวิชัย เกียรติเกรียงไกร (นายช่างโยธาปฏิบัติงาน)',
    'นายอนุชา เจริญผล (นายช่างโยธาปฏิบัติงาน)',
    'นายวีรชัย มีชัย (นายช่างไฟฟ้า)'
  ];

  var COMMITTEE = [
    { name: 'นายประสิทธิ์ สุวรรณโชติ', role: 'ประธาน', position: 'ปลัดเทศบาลตำบลสีแก้ว', phone: '081-987-6543' },
    { name: 'นางวิภาดา รัตนกุล', role: 'กรรมการ', position: 'หัวหน้าฝ่ายการคลังและพัสดุ', phone: '089-223-4123' },
    { name: 'นายทองคำ บุญมี', role: 'กรรมการ (ภาคประชาชน)', position: 'ผู้ใหญ่บ้าน หมู่ที่ 1 บ้านสีแก้ว', phone: '086-334-9910' }
  ];

  // [id, เลขที่สัญญา, e-GP, ชื่อ, ประเภท, หมู่, รายละเอียดที่ตั้ง, แหล่งงบ, วงเงิน, เบิกแล้ว,
  //  งวดปัจจุบัน, งวดทั้งหมด, ผู้รับจ้าง, ผู้ควบคุมงาน(index), เริ่ม, สิ้นสุด, ผลงานจริง%, แผน%, สถานะ]
  var RAW = [
    ['SK-67-001', 'สท. 04/2567', '661102931', 'ก่อสร้างถนน คสล. สายบ้านสีแก้ว - โคกสว่าง', 'road', 'm1', 'กว้าง 5.00 ม. ยาว 850 ม. หนา 0.15 ม.', 'specific-grant', 2450000, 1911000, 2, 3, 'หจก. สีแก้วคอนสตรัคชั่น 2019', 1, '2023-11-15', '2024-02-13', 78, 75, 'on-schedule'],
    ['SK-67-002', 'กช.67/014', '670200514', 'ก่อสร้างถนนคอนกรีตเสริมเหล็ก สายบ้านสีแก้ว - ดงเค็ง หมู่ที่ 1', 'road', 'm1', 'กว้าง 5.00 ม. หนา 0.15 ม. ระยะทาง 1,450 ม. ไหล่ทางลูกรังข้างละ 0.50 ม. พร้อมท่อระบายน้ำ คสล. ø 0.60 ม.', 'specific-grant', 2450000, 1225000, 3, 4, 'หจก. สีแก้วการโยธาพาณิชย์', 2, '2024-03-15', '2024-07-12', 78.4, 76.3, 'on-schedule'],
    ['SK-67-014', 'รอลงนามสัญญา', '670100412', 'เสริมผิวทางแอสฟัลท์ติกคอนกรีต สายบ้านดงเค็ง', 'road', 'm2', 'กว้าง 6.00 ม. ยาว 1,400 ม. หนา 0.05 ม.', 'specific-grant', 3200000, 0, 0, 2, 'หจก. ร้อยเอ็ดโชคดีการโยธา', 1, '2024-08-01', '2024-11-28', 0, 0, 'signing'],
    ['SK-67-016', 'สท. 11/2567', '661005217', 'ก่อสร้างถนน คสล. พร้อมรางระบายน้ำรูปตัววี', 'road', 'm8', 'ซอยกลางบ้าน ยาว 420 ม.', 'local', 1280000, 1280000, 2, 2, 'หจก. ร้อยเอ็ดวิศวกรรมโยธา', 4, '2023-10-20', '2024-01-17', 100, 100, 'completed'],
    ['SK-67-004', 'สท. 03/2567', '660911402', 'ก่อสร้างถนน คสล. ซอยเทศบาล 4', 'road', 'm3', 'กว้าง 4.00 ม. ยาว 380 ม. หนา 0.15 ม.', 'local', 1050000, 1050000, 2, 2, 'หจก. พลพัฒนาการช่าง', 1, '2023-10-10', '2023-12-24', 100, 100, 'completed'],
    ['SK-67-006', 'สท. 05/2567', '661103118', 'ซ่อมแซมถนนลูกรังเพื่อการเกษตร สายนาโคก', 'road', 'm5', 'ปรับเกรดและลงหินคลุก ยาว 1,200 ม.', 'local', 480000, 480000, 1, 1, 'หจก. ท่าม่วงศิลาแลง', 4, '2023-11-20', '2023-12-30', 100, 100, 'completed'],
    ['SK-67-020', 'รอลงนามสัญญา', '670900233', 'ก่อสร้างถนน คสล. ซอยร่วมใจ เชื่อมทางหลวงชนบท', 'road', 'm3', 'กว้าง 4.00 ม. ยาว 850 ม. หนา 0.15 ม.', 'general-grant', 2400000, 0, 0, 3, 'อยู่ระหว่างประกาศผู้ชนะ', 2, '2024-09-15', '2025-01-12', 0, 0, 'signing'],
    ['SK-67-009', 'ชย. 24/2567', '661210087', 'เสริมผิวจราจรแอสฟัลติกคอนกรีต สายบ้านดงยาง', 'road', 'm4', 'กว้าง 6.00 ม. ยาว 900 ม. หนา 0.05 ม.', 'specific-grant', 1850000, 1480000, 3, 3, 'หจก. เกียรติชัยศิริก่อสร้าง', 1, '2024-01-08', '2024-05-06', 96, 100, 'pending-inspection'],
    ['SK-67-010', 'สท. 08/2567', '661204415', 'ก่อสร้างสะพาน คสล. ข้ามห้วยแก้ว', 'road', 'm7', 'ช่วงความยาว 3 ช่วง รวม 30 ม. กว้าง 6.00 ม.', 'specific-grant', 2100000, 1015000, 2, 4, 'บจก. เมืองร้อยเอ็ดวิศวกรรมการโยธา', 2, '2024-02-01', '2024-07-30', 52, 50, 'on-schedule'],
    ['SK-67-012', 'สท. 06/2567', '661108844', 'ปรับปรุงถนนลาดยางสายรอบบึงสีแก้ว', 'road', 'm7', 'ผิวจราจรแอสฟัลท์ ยาว 1,100 ม.', 'general-grant', 1320000, 1320000, 2, 2, 'หจก. ร้อยเอ็ดโชคดีการโยธา', 1, '2023-11-25', '2024-02-22', 100, 100, 'completed'],
    ['SK-67-013', 'สท. 10/2567', '661201776', 'ก่อสร้างถนน คสล. ซอยประชาอุทิศ', 'road', 'm9', 'กว้าง 4.00 ม. ยาว 310 ม. หนา 0.15 ม.', 'local', 980000, 980000, 2, 2, 'หจก. สีแก้วคอนสตรัคชั่น 2019', 4, '2023-12-15', '2024-02-12', 100, 100, 'completed'],
    ['SK-67-017', 'สท. 12/2567', '661212093', 'ก่อสร้างถนนหินคลุกเพื่อการเกษตร', 'road', 'm5', 'กว้าง 4.00 ม. ยาว 1,600 ม. หนา 0.10 ม.', 'local', 650000, 650000, 1, 1, 'หจก. ท่าม่วงศิลาแลง', 4, '2024-01-10', '2024-02-24', 100, 100, 'completed'],
    ['SK-67-018', 'สท. 13/2567', '670101125', 'ปรับปรุงไหล่ทางและท่อลอดถนนสายหลัก', 'road', 'm2', 'ไหล่ทาง คสล. ยาว 600 ม. และท่อลอด ø 0.80 ม. 3 จุด', 'local', 720000, 720000, 1, 1, 'หจก. พลพัฒนาการช่าง', 1, '2024-01-15', '2024-03-15', 100, 100, 'completed'],
    ['SK-67-019', 'สท. 14/2567', '670103381', 'ขยายผิวจราจร คสล. หน้าโรงเรียนบ้านสีแก้ว', 'road', 'm1', 'ขยายข้างละ 1.00 ม. ยาว 350 ม.', 'local', 782500, 782500, 1, 1, 'หจก. สีแก้วคอนสตรัคชั่น 2019', 2, '2024-02-01', '2024-03-31', 100, 100, 'completed'],
    ['SK-67-005', 'สท. 07/2567', '661204882', 'ก่อสร้างรางระบายน้ำ คสล. รูปตัวยูพร้อมฝาปิด', 'drainage', 'm4', 'ช่วงโรงเรียนบ้านท่าม่วงถึงคลองส่งน้ำ', 'local', 1180000, 472000, 1, 2, 'บจก. เมืองร้อยเอ็ดวิศวกรรมการโยธา', 3, '2023-12-01', '2024-01-29', 42, 58, 'delayed'],
    ['SK-67-011', 'สท. 09/2567', '661208912', 'ขุดลอกสระน้ำสาธารณประโยชน์หนองบัว', 'drainage', 'm6', 'พื้นที่ขุดลอก 12,000 ตร.ม. ลึกเฉลี่ย 3.00 ม.', 'local', 920000, 0, 1, 2, 'หจก. ท่าม่วงศิลาแลง', 3, '2023-12-20', '2024-02-18', 30, 28, 'on-schedule'],
    ['SK-67-021', 'สท. 15/2567', '670105529', 'ขุดลอกคลองระบายน้ำและก่อสร้างกำแพงกันดินคันคลอง', 'drainage', 'm5', 'ยาว 640 ม. กำแพงกันดิน คสล. สูง 2.00 ม.', 'specific-grant', 2450000, 1837500, 2, 3, 'หจก. เกียรติชัยศิริก่อสร้าง', 4, '2024-02-05', '2024-06-03', 75, 70, 'pending-inspection'],
    ['SK-67-022', 'สท. 16/2567', '670107744', 'ปรับปรุงซ่อมแซมฝายชะลอน้ำ', 'drainage', 'm6', 'ฝาย คสล. กว้าง 12 ม. พร้อมบันไดปลา', 'local', 1640000, 492000, 1, 3, 'หจก. สีแก้วการโยธาพาณิชย์', 3, '2024-02-15', '2024-05-14', 38, 50, 'delayed'],
    ['SK-67-023', 'สท. 17/2567', '670110018', 'ก่อสร้างท่อลอดเหลี่ยม คสล. ข้ามลำห้วย', 'drainage', 'm3', 'ขนาด 2 ช่อง 1.80 x 1.80 ม. ยาว 8 ม.', 'specific-grant', 1960000, 1470000, 2, 3, 'หจก. พลพัฒนาการช่าง', 2, '2024-02-20', '2024-06-18', 74, 70, 'pending-inspection'],
    ['SK-67-024', 'ชย. 29/2567', '670112450', 'ก่อสร้างระบบระบายน้ำรูปตัวยู ชุมชนโนนสะอาด', 'drainage', 'm2', 'รางตัวยู คสล. ยาว 820 ม. พร้อมบ่อพัก', 'general-grant', 2980000, 2384000, 3, 4, 'บจก. เมืองร้อยเอ็ดวิศวกรรมการโยธา', 4, '2024-01-20', '2024-06-17', 82, 80, 'on-schedule'],
    ['SK-67-025', 'สท. 02/2567', '660905531', 'ขุดลอกลำห้วยแก้ว', 'drainage', 'm7', 'ยาว 2,100 ม. ขุดลึกเฉลี่ย 2.50 ม.', 'general-grant', 2380000, 2380000, 2, 2, 'หจก. ท่าม่วงศิลาแลง', 3, '2023-10-05', '2024-01-02', 100, 100, 'completed'],
    ['SK-67-008', 'ชย. 18/2567', '661001154', 'ปรับปรุงซ่อมแซมอาคารอเนกประสงค์เทศบาลตำบลสีแก้ว', 'building', 'm1', 'สำนักงานเทศบาลตำบลสีแก้ว (เปลี่ยนหลังคา ฝ้าเพดาน ระบบสายไฟ)', 'accumulated', 850000, 510000, 3, 3, 'หจก. พลพัฒนาการช่าง', 0, '2023-10-15', '2024-01-12', 95, 100, 'pending-inspection'],
    ['SK-67-026', 'สท. 18/2567', '670115602', 'ก่อสร้างอาคารศูนย์พัฒนาเด็กเล็กเทศบาลตำบลสีแก้ว', 'building', 'm9', 'อาคาร คสล. 1 ชั้น พื้นที่ 360 ตร.ม. ตามแบบ สถ.', 'specific-grant', 4250000, 3400000, 4, 5, 'บจก. เมืองร้อยเอ็ดวิศวกรรมการโยธา', 0, '2023-12-01', '2024-08-28', 80, 78, 'on-schedule'],
    ['SK-67-027', 'สท. 01/2567', '660902218', 'ก่อสร้างลานกีฬาอเนกประสงค์', 'building', 'm9', 'ลาน คสล. 30 x 40 ม. พร้อมหลังคาโครงเหล็ก', 'accumulated', 2145000, 2145000, 3, 3, 'หจก. สีแก้วคอนสตรัคชั่น 2019', 1, '2023-10-02', '2024-01-30', 100, 100, 'completed'],
    ['SK-67-028', 'สท. 19/2567', '670118734', 'ปรับปรุงห้องน้ำสาธารณะตลาดสดเทศบาล', 'building', 'm1', 'ห้องน้ำ 12 ห้อง พร้อมทางลาดผู้พิการ', 'local', 1440000, 1440000, 2, 2, 'หจก. พลพัฒนาการช่าง', 0, '2024-01-05', '2024-04-03', 100, 100, 'completed'],
    ['SK-67-003', 'สท. 01/2567-ฟ', '660900388', 'ติดตั้งโคมไฟถนนพลังงานแสงอาทิตย์ (Solar Cell) รอบตำบล 85 จุด', 'electrical', 'm1', 'สายทางหลัก ม.1 - ม.9 (เสาเหล็กชุบกัลวาไนซ์ สูง 6 ม.)', 'general-grant', 1700000, 1700000, 2, 2, 'บจก. กรีนเอ็นเนอร์ยี อีสาน', 1, '2023-10-01', '2023-12-28', 100, 100, 'completed'],
    ['SK-67-029', 'สท. 20/2567', '670120061', 'ติดตั้งระบบโคมไฟสาธารณะพลังงานแสงอาทิตย์ (Smart Solar)', 'electrical', 'm7', 'ถนนสายรอบบึง 42 จุด', 'specific-grant', 890000, 356000, 1, 2, 'บจก. พลังงานไทยร้อยเอ็ด', 5, '2024-02-10', '2024-05-09', 40, 62, 'delayed'],
    ['SK-67-030', 'ชย. 31/2567', '670122870', 'ขยายเขตไฟฟ้าและติดตั้งโคมไฟ LED ประหยัดพลังงาน', 'electrical', 'm8', 'ขยายเขตระบบจำหน่าย 1.2 กม. โคม LED 60 จุด', 'general-grant', 1752500, 0, 1, 1, 'บจก. กรีนเอ็นเนอร์ยี อีสาน', 5, '2024-03-01', '2024-05-30', 100, 100, 'pending-inspection']
  ];

  // กระจายพิกัดหมุดรอบหมู่บ้านแบบคงที่ (ไม่สุ่ม) เพื่อไม่ให้ซ้อนกัน
  var villageCount = {};
  function seedProjects() {
    return RAW.map(function (r) {
      var v = VILLAGES[r[5]];
      var n = villageCount[r[5]] = (villageCount[r[5]] || 0) + 1;
      var angle = n * 2.1;
      return {
        id: r[0], contractNo: r[1], egp: r[2], name: r[3], category: r[4], village: r[5],
        location: r[6], source: r[7], budget: r[8], disbursed: r[9],
        installment: r[10], installments: r[11], contractor: r[12], supervisor: STAFF[r[13]],
        start: r[14], end: r[15], actual: r[16], plan: r[17], status: r[18],
        lat: +(v.lat + Math.sin(angle) * 0.004 * n).toFixed(5),
        lng: +(v.lng + Math.cos(angle) * 0.004 * n).toFixed(5),
        createdAt: r[14]
      };
    });
  }

  // งวดงานละเอียดของโครงการตัวอย่าง (โครงการอื่นสร้างจากจำนวนงวดอัตโนมัติ)
  var MILESTONES = {
    'SK-67-002': [
      { pct: 25, title: 'งานปรับเกรดคันทางเดิม งานขุดลอกดินอ่อน และงานลงชั้นรองพื้นทางหินคลุกบดอัดแน่น หนา 0.20 ม.', note: 'ตรวจรับเสร็จสิ้นเมื่อ 10 เม.ย. 2567 • ฎีกาเบิกเงิน กช.67/0312', state: 'paid' },
      { pct: 25, title: 'งานวางท่อระบายน้ำ คสล. ชั้น 3 ขนาด ø 0.60 ม. พร้อมบ่อพัก คสล. สำเร็จรูป จำนวน 18 จุด เชื่อมคลองส่งน้ำเดิม', note: 'ตรวจรับเสร็จสิ้นเมื่อ 15 พ.ค. 2567 • ฎีกาเบิกเงิน กช.67/0448', state: 'paid' },
      { pct: 35, title: 'งานเทผิวจราจรคอนกรีตเสริมเหล็ก หนา 0.15 ม. พร้อมรอยต่อเผื่อขยาย (Expansion Joint) และหยอดยางรอยต่อ', note: 'เทคอนกรีตได้ 1,100 เมตร จากเป้าหมาย 1,450 เมตร (ก้าวหน้า 75% ของงวด) • กำหนดส่ง 28 มิ.ย. 67', state: 'active' },
      { pct: 15, title: 'งานลงลูกรังไหล่ทางข้างละ 0.50 ม. หนา 0.15 ม. งานตีเส้นจราจรเทอร์โมพลาสติกสีขาว-เหลือง และติดตั้งป้ายเตือนจราจร', note: 'กำหนดส่งมอบงานงวดสุดท้าย 12 ก.ค. 2567', state: 'pending' }
    ]
  };

  function seedDiary() {
    return [
      {
        id: 'D-0001', projectId: 'SK-67-002', date: '2024-06-18', time: '14:30', weather: 'แดดจัด ท้องฟ้าโปร่ง ไม่มีฝน (34°C)',
        installment: 3, coords: '16.054238, 103.652190', reporter: 'นายสมชาย ยืนยง (นายช่างโยธาชำนาญงาน)',
        title: 'ตรวจการเทคอนกรีตผิวจราจรช่วง กม. 0+850 ถึง 1+100',
        detail: 'ค่ายุบตัว 8.5 ซม. (เกณฑ์ 7.5 - 10 ซม.) คอนกรีตกำลังอัด 240 ksc • ควบคุมการบ่มด้วยกระสอบชุ่มน้ำต่อเนื่องอย่างน้อย 7 วัน • ตัด Joint ลึก 4 ซม. ทุกระยะ 4.00 ม.',
        tests: [{ name: 'Compaction Test ดินคันทาง', value: '96.8%', spec: 'เกณฑ์ ≥95%' }, { name: 'Cube/Cylinder Compressive (7 วัน)', value: '212 ksc', spec: 'เกณฑ์ ≥180 ksc' }],
        photos: [
          { src: IMG.slump, caption: 'การทดสอบ Slump Test', time: '14:15' },
          { src: IMG.curing, caption: 'งานบ่มคอนกรีต (Curing)', time: '15:05' },
          { src: IMG.joint, caption: 'งานตัดรอยต่อ คสล.', time: '16:30' }
        ]
      },
      {
        id: 'D-0002', projectId: 'SK-67-002', date: '2024-06-14', time: '10:00', weather: 'มีเมฆบางส่วน ฝนตกเล็กน้อยช่วงเช้า',
        installment: 3, coords: 'กม. 0+500', reporter: 'นายสมชาย ยืนยง (นายช่างโยธาชำนาญงาน)',
        title: 'ตรวจสอบแบบหล่อและเหล็กไวร์เมช',
        detail: 'ตรวจสอบแนวแบบเหล็กขอบถนนและการหนุนลูกปูนเหล็กตะแกรง Wire Mesh ø 6 มม. @ 0.20 ม. ก่อนการเทคอนกรีตช่วงที่ 2 ระยะทาง 350 เมตร ทุกจุดเป็นไปตามข้อกำหนดในแบบรูปรายการ',
        photos: []
      },
      {
        id: 'D-0003', projectId: 'SK-67-001', date: '2024-02-08', time: '11:15', weather: 'แดดจัด',
        installment: 2, coords: 'ม.1 ซอยอนามัยพัฒนา', reporter: 'นายสมคิด สว่างแดน (นายช่างโยธาปฏิบัติงาน)',
        title: 'เจาะเก็บตัวอย่างความหนาลูกปูน คสล. (Core Drill)',
        detail: 'เจาะเก็บตัวอย่างความหนาลูกปูน คสล. (Core Drill) ผ่านเกณฑ์ความหนาตามแบบ 0.15 ม.',
        photos: [{ src: IMG.coreDrill, caption: 'Core Drill', time: '11:15' }]
      },
      {
        id: 'D-0004', projectId: 'SK-67-021', date: '2024-05-20', time: '09:40', weather: 'ท้องฟ้าโปร่ง',
        installment: 2, coords: 'ม.5 คลองระบายน้ำ', reporter: 'นายอนุชา เจริญผล (นายช่างโยธาปฏิบัติงาน)',
        title: 'ผู้รับจ้างลงเครื่องจักร Backhoe ขุดลอกสันดอน',
        detail: 'ผู้รับจ้างลงเครื่องจักร Backhoe ขุดลอกสันดอนตะกอนดินแล้วเสร็จ 75% ของความยาวคลอง',
        photos: [{ src: IMG.excavator, caption: 'ขุดลอกคลอง', time: '09:40' }]
      },
      {
        id: 'D-0005', projectId: 'SK-67-029', date: '2024-05-19', time: '18:20', weather: 'เย็น ท้องฟ้าโปร่ง',
        installment: 1, coords: 'ม.7 ถนนสายรอบบึง', reporter: 'นายวีรชัย มีชัย (นายช่างไฟฟ้า)',
        title: 'ทดสอบระบบเปิด-ปิดไฟอัตโนมัติ Solar High-mast',
        detail: 'ทดสอบระบบเปิด-ปิดไฟอัตโนมัติ Solar High-mast จำนวน 14 เสา ใช้งานได้ปกติ 12 เสา แจ้งผู้รับจ้างแก้ไข 2 เสา',
        photos: [{ src: IMG.solarDusk, caption: 'Solar High-mast', time: '18:20' }]
      }
    ];
  }

  function seedDocuments() {
    return [
      { id: 'กช.67/014', type: 'order', title: 'สัญญาจ้างก่อสร้างถนน คสล. สายบ้านสีแก้ว - ดงเค็ง (ลงนามสมบูรณ์)', detail: 'สัญญาจ้างเลขที่ กช.67/014 ลงวันที่ 15 มี.ค. 2567', owner: 'นายธีรภัทร ชาญวิทย์', status: 'approved', date: '2024-03-15', projectId: 'SK-67-002', format: 'pdf' },
      { id: 'DWG-SK-67/002', type: 'drawing', title: 'แบบรูปรายการละเอียด ถนน คสล. สายบ้านสีแก้ว - ดงเค็ง', detail: 'Drawing ฉบับรับรอง 14 แผ่น', owner: 'นายพิเชษฐ์ ดำรงศิลป์', status: 'approved', date: '2024-02-20', projectId: 'SK-67-002', format: 'dwg' },
      { id: 'BOQ-SK-67/002', type: 'estimate', title: 'ตารางงวดงานงวดเงินและปริมาณงาน (BOQ)', detail: 'แบบ ปร.4 ปร.5 ประกอบสัญญา', owner: 'นายณัฐพล ประเสริฐสุข', status: 'approved', date: '2024-02-28', projectId: 'SK-67-002', format: 'xls' },
      { id: 'สภ.ปร-2567/089', type: 'estimate', title: 'แบบฟอร์ม ปร.4 ปร.5 โครงการซอยร่วมใจ ม.3', detail: 'งานก่อสร้างถนน คสล. พร้อมรางระบายน้ำรูปตัววี ต.สีแก้ว', owner: 'นายณัฐพล ประเสริฐสุข', status: 'approved', date: '2024-10-14', projectId: 'SK-67-020', format: 'pdf' },
      { id: 'คำสั่ง 142/2567', type: 'order', title: 'คำสั่งแต่งตั้งผู้ควบคุมงานและคณะกรรมการตรวจรับพัสดุ', detail: 'โครงการปรับปรุงผิวจราจรลาดยางแอสฟัลท์ติกคอนกรีต สายบ้านดงสว่าง', owner: 'นายสมานชัย รัตนวงศ์', status: 'waiting', date: '2024-10-13', projectId: 'SK-67-014', format: 'doc' },
      { id: 'บก.ส่งมอบ-01/67', type: 'inspection', title: 'บันทึกส่งมอบงานงวดที่ 1 สะพาน คสล. ข้ามห้วยแก้ว', detail: 'งานตอกเสาเข็มและโครงสร้างตอม่อสะพาน (เบิกจ่าย 35% ของสัญญา)', owner: 'นายพิเชษฐ์ ดำรงศิลป์', status: 'approved', date: '2024-10-11', projectId: 'SK-67-010', format: 'pdf' },
      { id: 'GEO-LAB-67/12', type: 'drawing', title: 'รายงานผลการเจาะทดสอบดิน (Soil Boring Log & CBR Test)', detail: 'พื้นที่ก่อสร้างอาคารศูนย์พัฒนาเด็กเล็กเทศบาลตำบลสีแก้ว', owner: 'สถาบันวิจัยปฐพีกลศาสตร์', status: 'approved', date: '2024-10-09', projectId: 'SK-67-026', format: 'pdf' },
      { id: 'สภ.ปร-2567/092', type: 'estimate', title: 'ร่างรายการประมาณราคาซ่อมแซมระบบประปาผิวดินขนาดใหญ่', detail: 'หมู่ 5 บ้านโคกหนองหญ้า (ปรับปรุงระบบตกตะกอนและระบบกรอง)', owner: 'นายพิเชษฐ์ ดำรงศิลป์', status: 'draft', date: '2024-10-08', projectId: '', format: 'xls' },
      { id: 'บันทึก 088/2567', type: 'order', title: 'บันทึกข้อความขออนุมัติจ้างออกแบบอาคารศูนย์พัฒนาเด็กเล็ก', detail: 'เสนอนายกเทศมนตรีตำบลสีแก้วเพื่อพิจารณาอนุมัติ', owner: 'นายธีรภัทร ชาญวิทย์', status: 'approved', date: '2024-10-04', projectId: 'SK-67-026', format: 'doc' },
      { id: 'ตร.งวด-67/031', type: 'inspection', title: 'ใบรายงานผลตรวจรับงานจ้าง งวดที่ 2 ท่อลอดเหลี่ยม คสล.', detail: 'คณะกรรมการตรวจรับพัสดุตรวจรับงานงวดที่ 2', owner: 'นายประสิทธิ์ สุวรรณโชติ', status: 'waiting', date: '2024-10-02', projectId: 'SK-67-023', format: 'pdf' },
      { id: 'DWG-SK-67/023', type: 'drawing', title: 'แบบรูปรายการท่อลอดเหลี่ยม คสล. 2 ช่อง 1.80 x 1.80 ม.', detail: 'แบบก่อสร้างฉบับรับรอง 6 แผ่น พร้อมรายการคำนวณ', owner: 'นายพิเชษฐ์ ดำรงศิลป์', status: 'approved', date: '2024-01-30', projectId: 'SK-67-023', format: 'dwg' },
      { id: 'DWG-ทถ-2566/07', type: 'drawing', title: 'แบบมาตรฐานถนน คสล. กรมทางหลวงชนบท (ทถ-2566)', detail: 'แบบมาตรฐานงานทางสำหรับองค์กรปกครองส่วนท้องถิ่น', owner: 'กองช่าง', status: 'approved', date: '2024-09-28', projectId: '', format: 'dwg' },
      { id: 'สภ.ปร-2567/085', type: 'estimate', title: 'ประมาณราคาก่อสร้างรางระบายน้ำรูปตัวยู ชุมชนโนนสะอาด', detail: 'ปร.4 ปร.5 ปร.6 พร้อมตาราง Factor F', owner: 'นายณัฐพล ประเสริฐสุข', status: 'approved', date: '2024-09-21', projectId: 'SK-67-024', format: 'xls' },
      { id: 'คำสั่ง 131/2567', type: 'order', title: 'คำสั่งแต่งตั้งคณะกรรมการกำหนดราคากลางงานก่อสร้าง', detail: 'ปีงบประมาณ พ.ศ. 2568', owner: 'นายสมานชัย รัตนวงศ์', status: 'approved', date: '2024-09-18', projectId: '', format: 'doc' },
      { id: 'DWG-SK-67/026', type: 'drawing', title: 'แบบแปลนอาคารศูนย์พัฒนาเด็กเล็ก (สถาปัตย์-โครงสร้าง)', detail: 'แบบก่อสร้างฉบับรับรอง 24 แผ่น', owner: 'นายพิเชษฐ์ ดำรงศิลป์', status: 'approved', date: '2024-09-10', projectId: 'SK-67-026', format: 'dwg' },
      { id: 'ตร.งวด-67/027', type: 'inspection', title: 'ใบรายงานผลตรวจรับงานจ้าง งวดสุดท้าย ลานกีฬาอเนกประสงค์', detail: 'ตรวจรับครบถ้วนตามสัญญา', owner: 'นายประสิทธิ์ สุวรรณโชติ', status: 'approved', date: '2024-09-02', projectId: 'SK-67-027', format: 'pdf' }
    ];
  }

  function seedPayments() {
    return [
      { id: 'ฎีกา 67-0842', projectId: 'SK-67-009', installment: 'งวดที่ 3 (สุดท้าย)', amount: 370000, status: 'audit', submitted: '2024-06-24', inspected: '2024-06-18', memo: 'ม.ช่าง 12/67' },
      { id: 'ฎีกา 67-0845', projectId: 'SK-67-024', installment: 'งวดที่ 3 (งานรางระบายน้ำ)', amount: 742500, status: 'sent', submitted: '2024-06-25', inspected: '2024-06-20', memo: 'ม.ช่าง 14/67' },
      { id: 'ฎีกา 67-0839', projectId: 'SK-67-008', installment: 'งวดที่ 3 (งวดสุดท้าย)', amount: 340000, status: 'approved', submitted: '2024-06-21', inspected: '2024-06-15', memo: 'ม.ช่าง 10/67' },
      { id: 'ฎีกา 67-0849', projectId: 'SK-67-030', installment: 'งวดเดียว (เหมาจ่าย)', amount: 1752500, status: 'sent', submitted: '2024-06-27', inspected: '2024-06-22', memo: 'ม.ช่าง 15/67' }
    ];
  }

  function seedNotifications() {
    return [
      { id: 'N1', icon: 'schedule', tone: 'secondary', title: 'ตรวจรับงานงวดที่ 2 ท่อลอดเหลี่ยม คสล.', text: 'คณะกรรมการตรวจรับพัสดุนัดหมายลงพื้นที่ บ่ายนี้ 13:30 น. ม.3', href: 'progress.html?id=SK-67-023', read: false },
      { id: 'N2', icon: 'hourglass_top', tone: 'primary', title: 'ครบกำหนดใน 5 วัน: งวดสุดท้ายงานเสริมผิวแอสฟัลท์', text: 'สัญญา ชย. 24/2567 ส่งหนังสือแจ้งผลทดสอบความหนาแน่น', href: 'progress.html?id=SK-67-009', read: false },
      { id: 'N3', icon: 'warning', tone: 'error', title: 'งานซ่อมแซมฝายชะลอน้ำ ม.6 ล่าช้ากว่าแผน 12%', text: 'เหลือเวลาสัญญา 12 วัน ควรออกหนังสือเร่งรัด (ว.119)', href: 'progress.html?id=SK-67-022', read: false }
    ];
  }

  function seed() {
    return {
      version: 1,
      projects: seedProjects(),
      milestones: MILESTONES,
      diary: seedDiary(),
      documents: seedDocuments(),
      payments: seedPayments(),
      notifications: seedNotifications(),
      inspections: [
        { projectId: 'SK-67-002', installment: 1, date: '2024-04-10', result: 'pass', note: 'ตรวจรับงานงวดที่ 1 ครบถ้วนตามสัญญา' },
        { projectId: 'SK-67-002', installment: 2, date: '2024-05-15', result: 'pass', note: 'ตรวจรับงานงวดที่ 2 ครบถ้วนตามสัญญา' }
      ],
      estimate: {
        projectId: 'SK-67-020', project: 'โครงการก่อสร้างถนน คสล. ซอยร่วมใจ เชื่อมทางหลวงชนบท',
        place: 'ซอยร่วมใจ หมู่ที่ 3 เชื่อมทางหลวงชนบท ต.สีแก้ว', qty: 'ผิวจราจร คสล. กว้าง 4.00 ม. ยาว 850 ม. หนา 0.15 ม.',
        date: '2024-10-14', factor: 1.3087, budget: 2500000,
        rows: [
          { name: 'กลุ่มงานโครงสร้างทางและดิน (Earthworks & Subbase)', cost: 540000 },
          { name: 'กลุ่มงานผิวทางคอนกรีตเสริมเหล็ก (Pavement Slab 240 ksc)', cost: 1120000 },
          { name: 'กลุ่มงานระบบระบายน้ำ ท่อ คสล. มอก. ชั้น 3 และบ่อพัก', cost: 190000 }
        ]
      },
      signatures: {
        'estimate-089': [
          { role: 'ประธานกรรมการ', name: 'นายสมานชัย รัตนวงศ์', position: 'หัวหน้าฝ่ายแบบแผนและก่อสร้าง', signedAt: '2024-10-14T11:20' },
          { role: 'กรรมการ', name: 'นายณัฐพล ประเสริฐสุข', position: 'วิศวกรโยธาปฏิบัติการ', signedAt: '2024-10-14T13:45' },
          { role: 'กรรมการและเลขานุการ', name: 'นายพิเชษฐ์ ดำรงศิลป์', position: 'นายช่างโยธาชำนาญงาน', signedAt: '2024-10-14T15:10' }
        ]
      },
      meta: { lastSync: null }
    };
  }

  // ---------- Store (localStorage) ----------
  var KEY = 'sikaew-kongchang-db-v1';
  var memory = null;

  function load() {
    if (memory) return memory;
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) memory = JSON.parse(raw);
    } catch (e) { memory = null; }
    if (!memory || memory.version !== 1) memory = seed();
    return memory;
  }

  // โครงการจริงจาก Google Sheet (ผ่านระบบงานเอกสาร) แสดงแทนข้อมูลตัวอย่างโดยไม่เขียนทับข้อมูลตัวอย่างในเครื่อง
  var external = null;

  function save() {
    try {
      var out = memory;
      if (external) { out = Object.assign({}, memory, { projects: external.sampleProjects }); }
      localStorage.setItem(KEY, JSON.stringify(out));
      return true;
    } catch (e) {
      return false;
    }
  }

  // ---------- File store (IndexedDB) ----------
  var dbPromise = null;
  function idb() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise(function (resolve, reject) {
      if (!window.indexedDB) return reject(new Error('IndexedDB unavailable'));
      var req = indexedDB.open('sikaew-kongchang-files', 1);
      req.onupgradeneeded = function () { req.result.createObjectStore('files', { keyPath: 'id' }); };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
    });
    return dbPromise;
  }
  function tx(mode, fn) {
    return idb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var t = db.transaction('files', mode);
        var r = fn(t.objectStore('files'));
        t.oncomplete = function () { resolve(r && r.result); };
        t.onerror = function () { reject(t.error); };
      });
    });
  }

  window.SK = window.SK || {};
  window.SK.ref = { VILLAGES: VILLAGES, CATEGORIES: CATEGORIES, STATUSES: STATUSES, SOURCES: SOURCES, STAFF: STAFF, COMMITTEE: COMMITTEE, IMG: IMG };
  window.SK.db = {
    get data() { return load(); },
    save: save,
    reset: function () { memory = seed(); save(); },
    exportJSON: function () { return JSON.stringify(load(), null, 2); },
    importJSON: function (text) {
      var obj = JSON.parse(text);
      if (!obj || !Array.isArray(obj.projects)) throw new Error('รูปแบบไฟล์ไม่ถูกต้อง');
      memory = obj; memory.version = 1; save();
    },
    project: function (id) { return load().projects.filter(function (p) { return p.id === id; })[0]; },
    useExternalProjects: function (list, info) {
      var d = load();
      external = { sampleProjects: external ? external.sampleProjects : d.projects, info: info || {} };
      d.projects = list;
    },
    get external() { return external ? external.info : null; },
    files: {
      put: function (file) {
        var id = 'F' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
        return tx('readwrite', function (s) { return s.put({ id: id, name: file.name, type: file.type, size: file.size, blob: file }); })
          .then(function () { return id; });
      },
      get: function (id) { return tx('readonly', function (s) { return s.get(id); }); }
    }
  };
})();
