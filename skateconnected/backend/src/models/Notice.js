const { DataTypes } = require("sequelize");

function defineNotice(sequelize) {
    return sequelize.define("Notice", {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        title: {
            type: DataTypes.STRING(100),
            allowNull: false,
        },
        content: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
        eventDate: {
            type: DataTypes.DATEONLY,
            allowNull: true,
        },
        approved: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            allowNull: false,
        },
        isPinned: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            allowNull: false,
        },
        addedById: {
            type: DataTypes.UUID,
            allowNull: false,
        },
    });
}

module.exports = { defineNotice };
