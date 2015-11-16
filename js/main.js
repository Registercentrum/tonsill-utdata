var TonsillWidget = {
	init: function(config) {
		Ext.apply(this.config, config);
		var conf = this.config;
		this._initComponents();
		this.loadUnitData(conf.unit);
	},
	config: {},
	onUnitChange: function() {

	},
	loadUnitData: function(unit) {
		TonsillWidget._loadData(unit, function(success, data) {
			if (success) {
				TonsillWidget.config.mainStore.loadData(data);
			}
		});
	},
	_loadData: function(unit, cb, data) {
		Ext.Ajax.request({
			type: 'ajax',
			method: 'get',
			url: 'https://stratum.registercentrum.se/api/statistics/ton/aggregates',
			params: {
				apiKey: TonsillWidget.config.apiKey,
				unit: unit
			},
			success: function(resp, opts) {
				var _data = Ext.decode(resp.responseText);
				var retData = data || {};
				Ext.Array.each(objectToArray(_data.data)[0].value, function(i) {
					retData[i.key] = retData[i.key] || {};
					retData[i.key]['year'] = i.key;
					retData[i.key]['cTotal' + (unit == 0 ? 'R' : '')] = i.value[0].value;
					retData[i.key]['cBleed' + (unit == 0 ? 'R' : '')] = i.value[1].value + i.value[2].value;
					retData[i.key]['sBleed' + (unit == 0 ? 'R' : '')] = i.value[3].value * 100;
				});
				if (unit !== 0) {
					TonsillWidget._loadData(0, cb, retData);
				} else {
					cb(true, Ext.Object.getValues(retData));
				}
			},
			failure: function() {
				cb(false);
			}
		});
	},
	_initComponents: function() {
		var chart, indicatorCombo, unitCombo, mainStore, ct, combosCt;
		var conf = TonsillWidget.config;
		ct = Ext.create('Ext.container.Container', {
			// xtype: 'container',
			layout: 'fit',
			// width: '640',
			renderTo: 'widget'
		});
		combosCt = Ext.create('Ext.container.Container', {
			layout: 'hbox',
			defaults: {
				margin: '0 10px 4px 0',
				// componentCls: 'standard-combo'
			},
			margin: '0 0 39px 0'
		});
		unitCombo = Ext.create({
			xtype: 'combo',
			// componentCls: 'ton-combo-standard',
			// cls: 'ton-combo-cls',
			// triggerWrapCls: 'ton-combo-trigger',
			width: 270,
			store: {
				fields: ['UnitCode', 'UnitName'],
				autoLoad: true,
				proxy: {
					type: 'ajax',
					url: 'https://stratum.registercentrum.se/api/metadata/units/register/129/?apikey=' + TonsillWidget.config.apiKey,
					reader: {
						type: 'json',
						rootProperty: 'data'
					}
				},
				sorters: ['UnitName']
			},
			listeners: {
				select: function(cb, records) {
					var me = this,
						unitId;
					if (!records) {
						return;
					}
					unitId = Ext.isArray(records) ? records[0].get('UnitCode') : records.get('UnitCode');
					if (unitId) {
						TonsillWidget.loadUnitData(unitId);
					}
				},
				focus: function(cb) {
					// cb.clearValue();
					cb.selectText();
					cb.expand();
				}
			},
			value: conf.unit,
			displayField: 'UnitName',
			valueField: 'UnitCode',
			// editable: true,
			typeAhead: true,
			anyMatch: true,
			forceSelection: true,
			queryMode: 'local',
			sendEmptyText: false
		});
		indicatorCombo = Ext.create({
			xtype: 'combo',
			flex: 1,
			store: {
				fields: ['value', 'display'],
				data: [{
					value: 'bleed',
					display: 'Återinlagd på sjukhus p.g.a blödning'
				}]
			},
			valueField: 'value',
			displayField: 'display',
			value: 'bleed'
		});
		mainStore = conf.mainStore = window.mainStore = Ext.create('Ext.data.Store', {
			fields: ['year', 'cBleed', 'sBleed', 'cBleedR', 'sBleedR']
				// autoLoad: true,
				// proxy: {
				// type: 'ajax',
				// url: 'https://stratum.registercentrum.se/api/statistics/ton/aggregates?unit=10001&apikey=' + TonsillWidget.config.apiKey,
				// reader: {
				// type: 'objecttoarray',
				// rootProperty: function(anObject) {
				// return objectToArray(anObject.data[Object.keys(anObject.data)[0]]);
				// }
				// }
				// },
				// fields: [{
				// name: 'key',
				// type: 'string',
				// mapping: 'key'
				// }, {
				// name: 'value',
				// type: 'float',
				// mapping: 'value[3].value'
				// }]
				// listeners: {
				// 	load: function(aStore, aList) {
				// 		linearChart.animate({
				// 			duration: 500,
				// 			to: {
				// 				opacity: 1
				// 			}
				// 		});
				// 	}
				// }
		});
		chart = Ext.create({
			xtype: 'cartesian',
			// renderTo: 'widget',
			width: 600,
			height: 400,
			store: mainStore,
			stacked: false,
			colors: ['#359aa3', '#f87c16'],
			axes: [{
				type: 'numeric',
				position: 'left',
				fields: ['sBleedR', 'sBleed'],
				maximum: 25,
				minimum: 0,
				majorTickSteps: 5,
				renderer: function(v) {
					return Ext.util.Format.number(v, '0%');
				},
				grid: {
					stroke: '#d8d8d8'
				}
			}, {
				type: 'category',
				position: 'bottom',
				fields: ['year']
			}],
			series: [{
					type: 'bar',
					xField: 'year',
					yField: ['sBleedR', 'sBleed'],
					stacked: false,
					useDarkerStrokeColor: false,
					style: {
						// fillOpacity: 0.7
					},
					renderer: function(sprite, config, rendererData, index) {
						var isLast = index === rendererData.store.count() - 1;
						return {
							fillOpacity: isLast ? 0.5 : 1,
							strokeOpacity: isLast ? 0 : 1,
						}
					}
				}
				/*,{
								type: 'bar',
								xField: 'year',
								yField: ['cBleed','cBleedR'],
								stacked: false,
								style: {
									fillOpacity: 0.7
								}
							}*/
			]
		});
		combosCt.add([unitCombo, indicatorCombo]);
		ct.add([combosCt, chart])
	},

}

Ext.onReady(function() {
	TonsillWidget.init({
		apiKey: 'J6b-GSKrkfk=',
		unit: 10001
	});
});