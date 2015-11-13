var TonsillWidget = {
	init: function(conf) {
		Ext.apply(this.config, conf);
		this._initComponents();
	},
	config: {},
	_initComponents: function() {
		var chart, indicatorCombo, unitCombo, mainStore, ct;
		ct = Ext.create({
			xtype: 'container',
			// layout: 'flex',
			// width: '640',
			renderTo: 'widget'
		});

		unitCombo = Ext.create({
			xtype: 'combo',
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
				}
			},
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
		mainStore = window.mainStore = Ext.create('Ext.data.Store', {
			autoLoad: true,
			proxy: {
				type: 'ajax',
				url: 'https://stratum.registercentrum.se/api/statistics/ton/aggregates?unit=10001&apikey=' + TonsillWidget.config.apiKey,
				reader: {
					type: 'objecttoarray',
					rootProperty: function(anObject) {
						return objectToArray(anObject.data[Object.keys(anObject.data)[0]]);
					}
				}
			},
			fields: [{
					name: 'key',
					type: 'string',
					mapping: 'key'
				}, {
					name: 'value',
					type: 'float',
					mapping: 'value[3].value'
				}]
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
			axes: [{
				type: 'numeric',
				position: 'left',
				fields: ['value'],
				grid: {
					odd: {
						opacity: 0.5,
						fill: '#ddd'
					}
				},
				label: {
					renderer: Ext.util.Format.numberRenderer('0,0')
				}
			}, {
				type: 'category',
				position: 'bottom',
				fields: ['key']
			}],
			series: [{
				type: 'bar',
				xField: 'key',
				yField: 'value',
				style: {
					fillOpacity: 0.7
				}
			}]
		});
		ct.add([unitCombo, indicatorCombo, chart])
	},

}

Ext.onReady(function() {
	TonsillWidget.init({
		apiKey: 'J6b-GSKrkfk='
	});
});