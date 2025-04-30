from rest_framework import serializers
from .models import Transacao

class TransacaoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Transacao
        fields = '__all__'


from rest_framework import serializers
from .models import Relatorio

class RelatorioSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()

    class Meta:
        model = Relatorio
        fields = ['id', 'nome', 'mes', 'ano', 'data_geracao', 'url']

    def get_url(self, obj):
        return obj.arquivo.url if obj.arquivo else None