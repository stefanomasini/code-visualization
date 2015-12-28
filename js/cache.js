export class ObjectCache {
    constructor() {
        this.map = new Map();
    }
    iteration() {
        var newObjectsMap = new Map(this.map);
        var getObj = (key, builder) => {
            var obj;
            if (this.map.has(key)) {
                obj = this.map.get(key);
                this.map.delete(key);
            } else {
                obj = builder();
            }
            newObjectsMap.set(key, obj);
            return obj;
        }
        var cleanup = (remove) => {
            for (var obj of this.map.values()) {
                remove(obj);
            }
            this.map = newObjectsMap;
        }
        return { getObj, cleanup };
    }
}
