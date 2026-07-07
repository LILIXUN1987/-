/**
 * 常用进出口 HS 编码快速查询（物流行业常见品类）
 */
export const HS_CODE_DATA: { code: string; name: string; category: string }[] = [
  // 电子电器
  { code: '84713000', name: '便携式自动数据处理设备（笔记本电脑/平板）', category: '电子电器' },
  { code: '84714100', name: '其他自动数据处理设备（台式电脑/服务器）', category: '电子电器' },
  { code: '85171200', name: '智能手机', category: '电子电器' },
  { code: '85183000', name: '耳机/耳塞（含蓝牙耳机）', category: '电子电器' },
  { code: '85176200', name: '路由器/交换机/网络通信设备', category: '电子电器' },
  { code: '85235110', name: 'U盘/固态硬盘/存储卡', category: '电子电器' },
  { code: '85287100', name: '电视机顶盒', category: '电子电器' },
  { code: '85423100', name: '集成电路/芯片', category: '电子电器' },
  { code: '85423900', name: '其他电子集成电路', category: '电子电器' },
  { code: '85044013', name: '锂电池充电器/电源适配器', category: '电子电器' },
  { code: '85076000', name: '锂离子蓄电池（含锂电池组）', category: '电子电器' },
  { code: '85414000', name: 'LED/光电半导体器件', category: '电子电器' },
  { code: '90138000', name: '液晶显示屏/LCD面板', category: '电子电器' },
  { code: '95030000', name: '电动玩具/遥控车/无人机（消费级）', category: '电子电器' },

  // 机械设备
  { code: '84148090', name: '空气压缩机/真空泵', category: '机械设备' },
  { code: '84138100', name: '液体泵', category: '机械设备' },
  { code: '84201000', name: '压光机/辊压机', category: '机械设备' },
  { code: '84283900', name: '连续输送提升设备', category: '机械设备' },
  { code: '84381000', name: '食品加工机械', category: '机械设备' },
  { code: '84501100', name: '全自动洗衣机', category: '机械设备' },
  { code: '84521000', name: '缝纫机', category: '机械设备' },
  { code: '84672100', name: '手电钻（电动工具）', category: '机械设备' },
  { code: '84795000', name: '工业机器人', category: '机械设备' },
  { code: '84818000', name: '阀门/水龙头/管件', category: '机械设备' },

  // 纺织服装
  { code: '61091000', name: '棉制T恤', category: '纺织服装' },
  { code: '62046200', name: '棉制牛仔裤/长裤', category: '纺织服装' },
  { code: '62019300', name: '化纤制男式夹克/外套', category: '纺织服装' },
  { code: '64039900', name: '皮鞋（橡胶/塑料底）', category: '纺织服装' },
  { code: '42022200', name: '手提包/背包（塑料/纺织面料）', category: '纺织服装' },
  { code: '61102000', name: '棉制针织套头衫/卫衣', category: '纺织服装' },
  { code: '62121000', name: '胸罩', category: '纺织服装' },
  { code: '63079000', name: '口罩/防护面罩（非医用）', category: '纺织服装' },

  // 家具家居
  { code: '94017100', name: '金属框架坐具（椅子/沙发）', category: '家具家居' },
  { code: '94035000', name: '木制卧室家具（床/衣柜/床头柜）', category: '家具家居' },
  { code: '94036000', name: '木制其他家具（桌/柜/架）', category: '家具家居' },
  { code: '94042900', name: '床垫（弹簧/海绵）', category: '家具家居' },
  { code: '69111000', name: '日用瓷器（碗/盘/杯）', category: '家具家居' },
  { code: '70109000', name: '玻璃瓶/罐/容器', category: '家具家居' },
  { code: '73239300', name: '不锈钢厨具/餐具', category: '家具家居' },
  { code: '82152000', name: '成套餐具（刀叉勺）', category: '家具家居' },
  { code: '39241000', name: '塑料餐具/厨房用品', category: '家具家居' },
  { code: '94052900', name: '台灯/落地灯', category: '家具家居' },

  // 化工产品
  { code: '29349900', name: '医药中间体/核酸类', category: '化工产品' },
  { code: '30049090', name: '其他药品/成品药', category: '化工产品' },
  { code: '32041600', name: '活性染料/纺织染料', category: '化工产品' },
  { code: '32064900', name: '无机颜料/色母粒', category: '化工产品' },
  { code: '33049900', name: '护肤品/化妆品', category: '化工产品' },
  { code: '34011100', name: '香皂/清洁皂', category: '化工产品' },
  { code: '38089100', name: '杀虫剂/农药制剂', category: '化工产品' },
  { code: '38140000', name: '有机溶剂/稀释剂/清洗剂', category: '化工产品' },
  { code: '38249999', name: '其他化工产品/添加剂', category: '化工产品' },
  { code: '39011000', name: '聚乙烯（PE）初级形态', category: '化工产品' },
  { code: '39021000', name: '聚丙烯（PP）初级形态', category: '化工产品' },
  { code: '39174000', name: '塑料管件/接头', category: '化工产品' },

  // 汽配五金
  { code: '40111000', name: '轿车轮胎', category: '汽配五金' },
  { code: '70091000', name: '汽车后视镜', category: '汽配五金' },
  { code: '85122010', name: '机动车照明/信号灯', category: '汽配五金' },
  { code: '87082900', name: '其他车身零部件', category: '汽配五金' },
  { code: '87089900', name: '其他汽车零配件', category: '汽配五金' },
  { code: '73181500', name: '螺栓/螺钉/螺母', category: '汽配五金' },
  { code: '73261900', name: '锻压制五金件', category: '汽配五金' },
  { code: '82041100', name: '手动扳手/螺丝刀', category: '汽配五金' },
  { code: '84821000', name: '滚珠轴承', category: '汽配五金' },

  // 食品饮料
  { code: '09011100', name: '未烘焙咖啡豆', category: '食品饮料' },
  { code: '09021000', name: '绿茶（未发酵）', category: '食品饮料' },
  { code: '21011100', name: '速溶咖啡/咖啡精', category: '食品饮料' },
  { code: '21069000', name: '保健食品/功能食品', category: '食品饮料' },
  { code: '22021000', name: '含糖饮料/碳酸饮料', category: '食品饮料' },
  { code: '22042100', name: '葡萄酒（2L以下装）', category: '食品饮料' },
  { code: '22083000', name: '威士忌酒', category: '食品饮料' },
  { code: '17019900', name: '蔗糖/白砂糖', category: '食品饮料' },

  // 危险品/特殊品
  { code: '28046100', name: '多晶硅/单晶硅', category: '危险品/特殊品' },
  { code: '28431000', name: '贵金属催化剂', category: '危险品/特殊品' },
  { code: '29153100', name: '乙酸乙酯（易燃液体）', category: '危险品/特殊品' },
  { code: '32081000', name: '油漆/清漆（溶剂型）', category: '危险品/特殊品' },
  { code: '36050000', name: '火柴', category: '危险品/特殊品' },
  { code: '38086100', name: '蚊香/杀虫气雾剂', category: '危险品/特殊品' },
  { code: '84089000', name: '内燃发动机/发电机', category: '危险品/特殊品' },
  { code: '85249100', name: '锂离子电池（含设备内）', category: '危险品/特殊品' },
];
