export default {
	update () {
		const newValue = NewSecretValue.text;

		if(remeda.isEmpty(newValue)) return;

		const selectedRows = Secret_Table.selectedRows;
		// console.log(selectedRows);
		// secret-name
		// path
		// value
		const bodies = remeda.pipe(
			selectedRows,
			remeda.groupBy(row => row["secret-name"]),
			remeda.mapValues((arr,key) => {
				return {
					secretName: key,
					jmsPaths : arr.map(e => e.path),
					newValues : arr.map(e=> newValue),
				}
			}),
			remeda.values
		);
		const end = remeda.keys(bodies).length;
		console.log(bodies);
		return bodies;
	}
}