export function cart2polar({x, y}) {
    return {
        a: Math.atan2(y, x),
        r: Math.sqrt(x*x + y*y),
    }
}

export function polar2cart({a, r}) {
    return {
        x: r * Math.cos(a),
        y: r * Math.sin(a),
    }
}

export function vectorAndDistanceBetweenTwoPoints(src, dst) {
    const dx = dst.x - src.x;
    const dy = dst.y - src.y;
    const dist = Math.sqrt(dx*dx + dy*dy);
    if (dist === 0) {
        return {
            v: { x: 1, y: 0 },
            dist: 0,
        }
    }
    return {
        v: { x: dx / dist, y: dy / dist },
        dist
    };
}

export function scaleXYVector(v, factor) {
    return {
        x: v.x * factor,
        y: v.y * factor,
    }
}

export function addXYVectors(a, b) {
    return {
        x: a.x + b.x,
        y: a.y + b.y,
    };
}
