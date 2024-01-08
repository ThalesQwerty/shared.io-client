import { Entity } from "../../lib/models/Entity.js";

class PlayerEntity extends Entity {
    name = "Thales";
    x = 0;
    y = 0;
}

const player = new PlayerEntity();